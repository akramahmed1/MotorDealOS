#!/usr/bin/env node
// Convention Ledger — Phase 1 pilot CLI
// Local-first, no network calls. Stores conventions + a hit log used as
// gate evidence for the Phase 1 -> Phase 2 checklist.

import fs from "fs";
import path from "path";
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

function cmdAdd(args) {
  const statement = args._[0];
  if (!statement) {
    console.error('Usage: agentdrift add "<statement>" --tags=x,y --source=AGENTS.md|CLAUDE.md');
    process.exit(1);
  }
  const tags = (args.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const source = args.source || null; // which file this convention should live in, if known
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

  data.conventions.push({
    id,
    statement,
    declared_in_project: currentProjectName(),
    declared_at: new Date().toISOString(),
    tags,
    source_file: source,
  });
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

function runCheck(target, cwd) {
  const content = fs.readFileSync(target, "utf8").toLowerCase();
  const data = loadLedger();
  const flags = [];

  for (const c of data.conventions) {
    // naive keyword overlap heuristic — flags for human review, never blocks
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

  const entry = {
    timestamp: new Date().toISOString(),
    project: path.basename(cwd),
    target,
    flagCount: flags.length,
    flaggedIds: flags.map((f) => f.convention.id),
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
    console.log(`  matched on: ${f.matchedWords.join(", ")}\n`);
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

  console.log("Phase 1 gate evidence:\n");
  console.log(`  Total check runs logged:     ${entries.length}`);
  console.log(`  Distinct projects used in:   ${projects.size} (${[...projects].join(", ") || "none"})`);
  console.log(`  Runs with at least 1 flag:   ${flaggedRuns.length}`);
  console.log(`  Confirmed TRUE positives:    ${truePositives.length}`);
  console.log(`  Confirmed FALSE positives:   ${falsePositives.length}`);
  console.log(`  Flags still unjudged:        ${unjudged.length}  (run \`agentdrift pending\`)`);

  const pass = {
    runs: entries.length >= 10,
    projects: projects.size >= 2,
    truePositive: truePositives.length >= 1,
    noFalsePositives: falsePositives.length === 0,
    allJudged: unjudged.length === 0,
  };

  console.log("\nGate checklist:");
  console.log(`  [${pass.runs ? "x" : " "}] 10+ check runs logged`);
  console.log(`  [${pass.projects ? "x" : " "}] used across 2+ projects`);
  console.log(`  [${pass.truePositive ? "x" : " "}] at least 1 confirmed true positive`);
  console.log(`  [${pass.noFalsePositives ? "x" : " "}] zero confirmed false positives`);
  console.log(`  [${pass.allJudged ? "x" : " "}] every flag manually judged (none left pending)`);

  const allPass = Object.values(pass).every(Boolean);
  console.log(`\n${allPass ? "✅ GATE PASSED — ready for Phase 2" : "❌ Gate not yet passed"}`);
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
    console.log(`Convention Ledger — Phase 1 pilot

Usage:
  agentdrift add "<statement>" [--tags=x,y] [--source=AGENTS.md|CLAUDE.md]
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
