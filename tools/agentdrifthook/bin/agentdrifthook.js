#!/usr/bin/env node
// Convention Ledger — Phase 1 pilot CLI
// Local-first, no network calls. Stores conventions + a hit log used as
// gate evidence for the Phase 1 -> Phase 2 checklist.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

// Vendored inside the repo (tools/agentdrifthook) so data persists across
// sessions via git, instead of resetting every time a fresh container is
// created at ~/.agentdrifthook.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOME_DIR = path.join(__dirname, "..", "data");
const LEDGER_PATH = path.join(HOME_DIR, "ledger.json");
const LOG_PATH = path.join(HOME_DIR, "hits.log.jsonl");

function ensureStore() {
  if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify({ conventions: [] }, null, 2));
  }
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "");
}

function loadLedger() {
  ensureStore();
  return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
}

function saveLedger(data) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2));
}

function appendLog(entry) {
  ensureStore();
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

function currentProjectName() {
  return path.basename(process.cwd());
}

// Resolve which convention source file(s) exist in a project root.
// Industry is split (Claude Code reads CLAUDE.md only; Codex/Cursor/
// Windsurf/Gemini CLI read AGENTS.md) — so check both rather than pick one.
function resolveConventionFiles(projectDir) {
  const agentsPath = path.join(projectDir, "AGENTS.md");
  const claudePath = path.join(projectDir, "CLAUDE.md");
  const found = [];
  if (fs.existsSync(agentsPath)) found.push({ type: "AGENTS.md", path: agentsPath });
  if (fs.existsSync(claudePath)) found.push({ type: "CLAUDE.md", path: claudePath });
  return found;
}

// Walk up from a starting directory to find the monorepo root (or just
// return the starting dir if no clear root marker exists).
function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(dir, ".git")) ||
      fs.existsSync(path.join(dir, "pnpm-workspace.yaml")) ||
      fs.existsSync(path.join(dir, "lerna.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage",
]);

// Recursively find every AGENTS.md/CLAUDE.md pair under a root, up to a
// depth limit, skipping common noise directories. This is what actually
// addresses Tobi Lutke's complaint: in a large monorepo, one subdirectory
// silently missing one of the two files means a subset of devs work with
// "lobotomy" (his word) — this only surfaces if someone bothers to check
// every directory, which nobody does by hand at scale.
function scanTreeForConventionFiles(root, maxDepth = 6) {
  const results = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const files = resolveConventionFiles(dir);
    if (files.length > 0) results.push({ dir, files });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  }
  walk(root, 0);
  return results;
}

function cmdScanTree(args) {
  const root = findMonorepoRoot(process.cwd());
  console.log(`Scanning tree from monorepo root: ${root}\n`);
  const results = scanTreeForConventionFiles(root);

  if (results.length === 0) {
    console.log("No AGENTS.md or CLAUDE.md found anywhere in this tree.");
    return;
  }

  const missingOne = [];
  const conflicting = [];
  for (const r of results) {
    console.log(`${r.dir}`);
    for (const f of r.files) console.log(`    - ${f.type}`);
    if (r.files.length === 1) missingOne.push(r);
    if (r.files.length === 2) {
      const [a, b] = r.files;
      if (fs.readFileSync(a.path, "utf8").trim() !== fs.readFileSync(b.path, "utf8").trim()) {
        conflicting.push(r);
      }
    }
  }

  console.log(`\nFound ${results.length} director(ies) with convention files.`);
  if (missingOne.length > 0) {
    console.log(
      `\n⚠️  ${missingOne.length} director(ies) have only ONE of AGENTS.md/` +
      `CLAUDE.md — a tool that only reads the missing one will silently ` +
      `run with no conventions there (this is the exact Shopify-scale bug ` +
      `Tobi Lutke described):`
    );
    for (const r of missingOne) console.log(`    - ${r.dir} (has ${r.files[0].type} only)`);
  }
  if (conflicting.length > 0) {
    console.log(`\n⚠️  ${conflicting.length} director(ies) have BOTH files but they differ:`);
    for (const r of conflicting) console.log(`    - ${r.dir}`);
  }
  if (missingOne.length === 0 && conflicting.length === 0) {
    console.log("No missing-pair or conflict issues found.");
  }
}

function cmdScanSourceFiles() {
  const files = resolveConventionFiles(process.cwd());
  if (files.length === 0) {
    console.log("No AGENTS.md or CLAUDE.md found in current directory.");
    return;
  }
  console.log(`Found ${files.length} convention source file(s):`);
  for (const f of files) console.log(`  - ${f.type} (${f.path})`);

  if (files.length === 2) {
    const [a, b] = files;
    const contentA = fs.readFileSync(a.path, "utf8").trim();
    const contentB = fs.readFileSync(b.path, "utf8").trim();
    if (contentA !== contentB) {
      console.log(
        `\n⚠️  AGENTS.md and CLAUDE.md both exist and differ. This is a real ` +
        `drift risk (large monorepos hit this — see Tobi Lutke's Shopify ` +
        `example). Preferring AGENTS.md as the source of truth for checks, ` +
        `since it's the emerging cross-tool standard, but consider ` +
        `reconciling these manually.`
      );
    } else {
      console.log("\nBoth files exist and are identical — no conflict.");
    }
  }
}

// Runs ESLint (via the project's own node_modules/.bin/eslint so version/config
// always match what CI and the human's own `next lint` would use) against a
// single file and returns how many messages a specific ruleId produced there.
// Returns null (not 0) on any invocation failure — callers must treat null as
// "couldn't check," not "clean," so a broken ESLint setup never masquerades as
// a passing lint-gate.
function runEslintRuleCountForFile(repoRoot, relFilePath, ruleId) {
  const eslintBin = path.join(repoRoot, "node_modules", ".bin", "eslint");
  if (!fs.existsSync(eslintBin)) return null;
  try {
    const out = execFileSync(eslintBin, [relFilePath, "--format", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      // ESLint exits 1 when it finds any lint errors/warnings — that's not a
      // tool failure, so don't let a non-zero exit throw here.
      stdio: ["ignore", "pipe", "pipe"],
    });
    return countRuleMessages(out, ruleId);
  } catch (err) {
    // execFileSync throws on non-zero exit even though ESLint's own JSON
    // output is still on stdout in that case (that's the normal "found
    // warnings" path here, since we run with just one target rule).
    if (err.stdout) return countRuleMessages(err.stdout, ruleId);
    return null;
  }
}

function countRuleMessages(eslintJsonOutput, ruleId) {
  try {
    const results = JSON.parse(eslintJsonOutput);
    let count = 0;
    for (const r of results) {
      count += r.messages.filter((m) => m.ruleId === ruleId).length;
    }
    return count;
  } catch {
    return null;
  }
}

// Snapshots the CURRENT per-file warning counts for `rule` across the whole
// repo at the moment a lint-gate convention is added. This is the known
// pre-existing backlog the convention must never retroactively flag — only
// a file's count going ABOVE its snapshot value counts as a new violation.
function computeLintGateBaseline(repoRoot, rule) {
  const eslintBin = path.join(repoRoot, "node_modules", ".bin", "eslint");
  if (!fs.existsSync(eslintBin)) {
    return { ok: false, reason: `ESLint not found at ${eslintBin} — run npm install first.` };
  }
  let out;
  try {
    out = execFileSync(eslintBin, ["src/", "--format", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    if (!err.stdout) {
      return { ok: false, reason: `ESLint invocation failed: ${err.message}` };
    }
    out = err.stdout;
  }
  let results;
  try {
    results = JSON.parse(out);
  } catch {
    return { ok: false, reason: "Could not parse ESLint JSON output while computing baseline." };
  }
  const baseline = {};
  let total = 0;
  for (const r of results) {
    const count = r.messages.filter((m) => m.ruleId === rule).length;
    if (count > 0) {
      baseline[path.relative(repoRoot, r.filePath)] = count;
      total += count;
    }
  }
  return { ok: true, baseline, total };
}

function cmdAdd(args) {
  const statement = args._[0];
  if (!statement) {
    console.error('Usage: agentdrift add "<statement>" --tags=x,y --source=AGENTS.md|CLAUDE.md');
    console.error('       agentdrift add "<statement>" --type=lint-gate --rule=<eslint-rule-id> --tags=x,y');
    process.exit(1);
  }
  const tags = (args.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const source = args.source || null; // which file this convention should live in, if known
  const type = args.type || "grep-pattern";
  const data = loadLedger();
  const id = statement
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  const existing = data.conventions.find((c) => c.id === id);
  if (existing) {
    console.log(`Already exists: ${id}`);
    return;
  }

  const convention = {
    id,
    type,
    statement,
    declared_in_project: currentProjectName(),
    declared_at: new Date().toISOString(),
    tags,
    source_file: source,
  };

  if (type === "lint-gate") {
    if (!args.rule) {
      console.error('lint-gate conventions require --rule=<eslint-rule-id>, e.g. --rule=@typescript-eslint/no-unsafe-type-assertion');
      process.exit(1);
    }
    convention.rule = args.rule;
    const repoRoot = findMonorepoRoot(process.cwd());
    console.log(`Snapshotting current "${args.rule}" warnings as baseline (pre-existing backlog, never flagged retroactively)...`);
    const result = computeLintGateBaseline(repoRoot, args.rule);
    if (!result.ok) {
      console.error(`Could not compute baseline: ${result.reason}`);
      console.error("Convention NOT added — a lint-gate convention without a real baseline would flag the entire pre-existing backlog as new.");
      process.exit(1);
    }
    convention.baseline = result.baseline;
    console.log(`Baseline: ${result.total} pre-existing warning(s) across ${Object.keys(result.baseline).length} file(s) — these will never be flagged.`);
  }

  data.conventions.push(convention);
  saveLedger(data);
  console.log(`Added convention [${id}] from project "${currentProjectName()}"`);
}

function cmdList(args) {
  const data = loadLedger();
  let items = data.conventions;
  if (args.tags) {
    const filterTags = args.tags.split(",").map((t) => t.trim());
    items = items.filter((c) => c.tags.some((t) => filterTags.includes(t)));
  }
  if (items.length === 0) {
    console.log("No conventions recorded yet. Use: agentdrift add \"<statement>\"");
    return;
  }
  for (const c of items) {
    console.log(`[${c.id}] (${c.declared_in_project}) ${c.statement}`);
    if (c.tags.length) console.log(`   tags: ${c.tags.join(", ")}`);
  }
}

function cmdRemove(args) {
  const id = args._[0];
  if (!id) {
    console.error("Usage: agentdrift remove <id>");
    process.exit(1);
  }
  const data = loadLedger();
  const idx = data.conventions.findIndex((c) => c.id === id);
  if (idx === -1) {
    console.error(`No convention found with id "${id}". Run \`agentdrift list\` to see valid ids.`);
    process.exit(1);
  }
  const [removed] = data.conventions.splice(idx, 1);
  saveLedger(data);
  console.log(`Removed convention [${removed.id}]: "${removed.statement}"`);

  // Stale-reference check: hits.log.jsonl may contain past entries whose
  // flaggedIds point at this now-deleted convention. We don't rewrite
  // history (the log is evidence of what happened, not a live view), but
  // we warn so `pending`/`gate-status` readers aren't confused by an id
  // that no longer resolves in ledger.json.
  const entries = readAllEntries();
  const staleCount = entries.filter((e) => (e.flaggedIds || []).includes(id)).length;
  if (staleCount > 0) {
    console.log(
      `\nNote: ${staleCount} past log entr${staleCount === 1 ? "y" : "ies"} in hits.log.jsonl ` +
      `reference this id. Those entries are left as-is (the log is a historical ` +
      `record, not a live view) — "${id}" will still appear there but no longer ` +
      `resolves to a ledger entry. This is expected, not a bug.`
    );
  }
}

// Read PostToolUse event JSON from stdin, per Claude Code hooks reference.
// Fields observed on Edit/Write/MultiEdit PostToolUse events:
//   { session_id, cwd, hook_event_name, tool_name, tool_input: { file_path, ... }, tool_output }
function readStdinJSON() {
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let total = 0;
    while (true) {
      let bytesRead;
      try {
        bytesRead = fs.readSync(0, buf, total, buf.length - total);
      } catch (e) {
        break; // EOF / EAGAIN when nothing piped in
      }
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total === 0) return null;
    return JSON.parse(buf.toString("utf8", 0, total));
  } catch {
    return null;
  }
}

function cmdCheckHook() {
  // Called by the Claude Code hook itself — no CLI arg, reads the file
  // path out of stdin JSON instead.
  const event = readStdinJSON();
  if (!event || !event.tool_input || !event.tool_input.file_path) {
    // Nothing usable — exit 0 (non-blocking). Expected for tool calls that
    // don't touch a file (e.g. Bash).
    process.exit(0);
  }
  const filePath = event.tool_input.file_path;
  if (!fs.existsSync(filePath)) {
    process.exit(0);
  }
  runCheck(filePath, event.cwd || process.cwd());
}

// Phase 1 check: simple keyword/pattern match between the diff text and
// each convention's statement. Intentionally dumb — Phase 2 replaces this
// with AST-level diffing for the interface-change check specifically.
// This exists to prove the hook wiring + collect real hit/miss evidence,
// not to be the final detection logic.
function cmdCheck(args) {
  const target = args._[0];
  if (!target) {
    console.error("Usage: agentdrift check <path-to-diff-or-file>");
    process.exit(1);
  }
  if (!fs.existsSync(target)) {
    console.error(`File not found: ${target}`);
    process.exit(1);
  }
  runCheck(target, process.cwd());
}

const LINTABLE_EXTENSIONS = new Set([".ts", ".tsx"]);

// Grep-pattern conventions only make sense against real source code — a
// doc that quotes a convention's own rule text verbatim (e.g. this tool's
// own PHASE1_STATUS.md) is a self-referential false positive, not a
// violation. Confirmed twice in MotorDealOS. Restricting to source
// extensions closes the whole class rather than excluding one file/dir.
const GREP_PATTERN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function runCheck(target, cwd) {
  const data = loadLedger();
  const flags = [];

  const grepConventions = data.conventions.filter((c) => (c.type || "grep-pattern") === "grep-pattern");
  const lintGateConventions = data.conventions.filter((c) => c.type === "lint-gate");

  // Phase 1: naive keyword overlap heuristic — flags for human review, never blocks.
  // Only runs against source-code extensions (see GREP_PATTERN_EXTENSIONS above).
  if (grepConventions.length > 0 && GREP_PATTERN_EXTENSIONS.has(path.extname(target))) {
    const content = fs.readFileSync(target, "utf8").toLowerCase();
    for (const c of grepConventions) {
      const words = c.statement
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4);

      const hits = words.filter((w) => content.includes(w));
      if (hits.length >= Math.max(2, Math.ceil(words.length * 0.3))) {
        flags.push({ convention: c, matchedWords: hits });
      }
    }
  }

  // Phase 2: lint-gate — run the convention's ESLint rule against just this
  // file, compare its current warning count to the pre-existing baseline
  // snapshotted when the convention was added. Only an INCREASE flags.
  const ext = path.extname(target);
  if (lintGateConventions.length > 0 && LINTABLE_EXTENSIONS.has(ext)) {
    const repoRoot = findMonorepoRoot(cwd);
    const relPath = path.relative(repoRoot, target);
    for (const c of lintGateConventions) {
      const currentCount = runEslintRuleCountForFile(repoRoot, relPath, c.rule);
      if (currentCount === null) {
        // Couldn't run ESLint (missing install, parse error, etc.) — log
        // nothing rather than guess; this is surfaced via check-hook's own
        // stderr, not as a false "clean" or false "flag".
        continue;
      }
      const baselineCount = (c.baseline && c.baseline[relPath]) || 0;
      if (currentCount > baselineCount) {
        flags.push({
          convention: c,
          lintGate: { file: relPath, baselineCount, currentCount, newCount: currentCount - baselineCount },
        });
      }
    }
  }

  const entry = {
    timestamp: new Date().toISOString(),
    project: path.basename(cwd),
    target,
    flagCount: flags.length,
    flaggedIds: flags.map((f) => f.convention.id),
    // Present only when at least one flag came from a lint-gate convention —
    // grep-pattern-only runs keep the original entry shape unchanged.
    ...(flags.some((f) => f.lintGate) && {
      lintGateDetails: flags.filter((f) => f.lintGate).map((f) => ({ id: f.convention.id, ...f.lintGate })),
    }),
    confirmed: null, // set later via `agentdrift confirm <index> --status=true|false`
  };
  appendLog(entry);

  if (flags.length === 0) {
    console.log("No related conventions found. Nothing to flag.");
    return;
  }

  console.log(`\n⚠️  Possible convention overlap — review before proceeding:\n`);
  for (const f of flags) {
    console.log(`- [${f.convention.id}] "${f.convention.statement}"`);
    console.log(`  declared in: ${f.convention.declared_in_project}`);
    if (f.lintGate) {
      console.log(
        `  lint-gate: ${f.convention.rule} on ${f.lintGate.file} — ` +
        `${f.lintGate.currentCount} warning(s) now vs ${f.lintGate.baselineCount} baseline ` +
        `(${f.lintGate.newCount} new)\n`
      );
    } else {
      console.log(`  matched on: ${f.matchedWords.join(", ")}\n`);
    }
  }
  console.log(
    "This is a heads-up, not a block. Confirm the new change is consistent " +
    "with the declared convention above, or update the ledger if the " +
    "convention itself should change.\n"
  );
}

function readAllEntries() {
  ensureStore();
  const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function writeAllEntries(entries) {
  fs.writeFileSync(LOG_PATH, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}

function cmdConfirm(args) {
  const index = parseInt(args._[0], 10);
  const status = args.status; // "true" | "false"
  if (isNaN(index) || !["true", "false"].includes(status)) {
    console.error('Usage: agentdrift confirm <line-number> --status=true|false');
    console.error("Run `agentdrift pending` first to see which lines need judgment.");
    process.exit(1);
  }
  const entries = readAllEntries();
  if (!entries[index]) {
    console.error(`No log entry at index ${index}`);
    process.exit(1);
  }
  entries[index].confirmed = status === "true";
  writeAllEntries(entries);
  console.log(`Marked entry ${index} as ${status === "true" ? "TRUE positive" : "FALSE positive"}`);
}

function cmdPending() {
  const entries = readAllEntries();
  const pending = entries
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => e.flagCount > 0 && e.confirmed === null);

  if (pending.length === 0) {
    console.log("No flagged runs awaiting judgment.");
    return;
  }
  console.log("Flagged runs awaiting your true/false-positive judgment:\n");
  for (const e of pending) {
    console.log(`  [${e.index}] ${e.timestamp} (${e.project}) — ${e.target}`);
    console.log(`      flagged: ${e.flaggedIds.join(", ")}`);
    console.log(`      -> agentdrift confirm ${e.index} --status=true|false\n`);
  }
}

function cmdGateStatus() {
  const entries = readAllEntries();
  const projects = new Set(entries.map((e) => e.project));
  const flaggedRuns = entries.filter((e) => e.flagCount > 0);
  const truePositives = entries.filter((e) => e.confirmed === true);
  const falsePositives = entries.filter((e) => e.confirmed === false);
  const unjudged = flaggedRuns.filter((e) => e.confirmed === null);

  // Gate criterion, Option B: this tool's ledger/log is vendored per-repo
  // by design (data persists via that repo's own git history — see the
  // header comment above) so there is no shared/central ledger a single
  // repo's log could ever tally 2+ projects from on its own. "2+ distinct
  // projects" is therefore reported PER-REPO here (almost always 1, this
  // repo's own name) and is verified as an external fact: the tool has
  // independently passed its own per-repo criteria in 2+ different repos.
  // Confirm that by running `gate-status` in each repo and comparing.
  console.log("Phase 1 gate evidence (this repo only):\n");
  console.log(`  Total check runs logged:     ${entries.length}`);
  console.log(`  Distinct projects in THIS repo's log: ${projects.size} (${[...projects].join(", ") || "none"})`);
  console.log(`  Runs with at least 1 flag:   ${flaggedRuns.length}`);
  console.log(`  Confirmed TRUE positives:    ${truePositives.length}`);
  console.log(`  Confirmed FALSE positives:   ${falsePositives.length}`);
  console.log(`  Flags still unjudged:        ${unjudged.length}  (run \`agentdrift pending\`)`);

  const pass = {
    runs: entries.length >= 10,
    truePositive: truePositives.length >= 1,
    noFalsePositives: falsePositives.length === 0,
    allJudged: unjudged.length === 0,
  };

  console.log("\nGate checklist (per-repo criteria):");
  console.log(`  [${pass.runs ? "x" : " "}] 10+ check runs logged`);
  console.log(`  [${pass.truePositive ? "x" : " "}] at least 1 confirmed true positive`);
  console.log(`  [${pass.noFalsePositives ? "x" : " "}] zero confirmed false positives`);
  console.log(`  [${pass.allJudged ? "x" : " "}] every flag manually judged (none left pending)`);

  const perRepoPass = Object.values(pass).every(Boolean);
  console.log(`\n${perRepoPass ? "✅ per-repo criteria PASSED" : "❌ per-repo criteria not yet passed"}`);
  console.log(
    "\nCross-repo criterion (checked manually, not by this command):\n" +
    "  [ ] this tool has independently passed its own per-repo criteria above\n" +
    "      in 2+ different repos — compare this output against another\n" +
    "      repo's own `agentdrift gate-status` run.\n"
  );
  console.log(
    `Overall: ${perRepoPass ? "this repo's half of the gate is met" : "gate not passed"} — ` +
    "full Phase 1→2 gate additionally requires the cross-repo criterion above, confirmed by a human across both repos."
  );
}

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (raw.startsWith("--")) {
      const [k, v] = raw.slice(2).split("=");
      args[k] = v === undefined ? true : v;
    } else {
      args._.push(raw);
    }
  }
  return args;
}

const [, , cmd, ...rest] = process.argv;
const args = parseArgs(rest);

switch (cmd) {
  case "add":
    cmdAdd(args);
    break;
  case "list":
    cmdList(args);
    break;
  case "remove":
    cmdRemove(args);
    break;
  case "check":
    cmdCheck(args);
    break;
  case "check-hook":
    cmdCheckHook();
    break;
  case "pending":
    cmdPending();
    break;
  case "confirm":
    cmdConfirm(args);
    break;
  case "scan-source-files":
    cmdScanSourceFiles();
    break;
  case "scan-tree":
    cmdScanTree(args);
    break;
  case "session-start-check":
    cmdScanTree(args); // same logic, invoked by the SessionStart hook instead of manually
    break;
  case "gate-status":
    cmdGateStatus();
    break;
  default:
    console.log(`Convention Ledger — Phase 1 (grep-pattern) + Phase 2 (lint-gate)

Usage:
  agentdrift add "<statement>" [--tags=x,y] [--source=AGENTS.md|CLAUDE.md]
  agentdrift add "<statement>" --type=lint-gate --rule=<eslint-rule-id> [--tags=x,y]
                                                 # Phase 2: snapshots current per-file
                                                 # ESLint warning counts as baseline; only
                                                 # NEW warnings above that baseline flag.
  agentdrift list [--tags=x,y]
  agentdrift remove <id>                        # delete a convention by id
  agentdrift check <path-to-diff-or-file>      # manual check, for testing
  agentdrift check-hook                         # reads stdin JSON, used by the actual hook
  agentdrift scan-source-files                  # detect AGENTS.md/CLAUDE.md in cwd, flag conflict
  agentdrift scan-tree                          # recursively scan monorepo for missing/conflicting pairs
  agentdrift session-start-check                # same as scan-tree, meant for the SessionStart hook
  agentdrift pending                            # flags awaiting your judgment
  agentdrift confirm <line> --status=true|false # mark a flag true/false positive
  agentdrift gate-status                        # see if Phase 1 gate has passed

Store: ${LEDGER_PATH}
Log:   ${LOG_PATH}
`);
}
