# agentdrifthook

Convention ledger + drift-detection hooks for Claude Code sessions. Vendored into this
repo (rather than living at `~/agentdrifthook`) so its data survives across sessions via
git instead of resetting every time a fresh container is created — see `data/ledger.json`
and `data/hits.log.jsonl`, both tracked, not gitignored.

Wired into `.claude/settings.json`: `SessionStart` runs `session-start-check`
(scans for missing/conflicting AGENTS.md/CLAUDE.md pairs); `PostToolUse` on Edit/Write
runs `check-hook` against the touched file.

## Convention types

### `grep-pattern` (Phase 1 — default when `type` is omitted)

Naive keyword-overlap matching between a convention's `statement` text and the edited
file's content. Flags for human review; never blocks. Good for catching drift on
documented prose conventions (e.g. "leads must always carry TCPA consent metadata"),
bad at anything structural — see `PHASE1_STATUS.md` for its known limitation.

```
agentdrift add "<statement>" [--tags=x,y] [--source=AGENTS.md|CLAUDE.md]
```

### `lint-gate` (Phase 2)

Runs a specific ESLint rule against just the edited file (not the whole repo — that would
be slow on every keystroke) and compares its warning count to a baseline snapshotted at
the moment the convention was added. **Only an increase above that baseline flags** — the
pre-existing backlog present when the convention was created is never retroactively
flagged, so adding a lint-gate convention to a codebase with existing violations doesn't
immediately spam every future edit to those files.

```
agentdrift add "<statement>" --type=lint-gate --rule=<eslint-rule-id> [--tags=x,y]
```

Requirements: the target repo needs a working ESLint setup — `node_modules/.bin/eslint`
plus an ESLint config (`eslint.config.mjs` here) that resolves the given rule. Type-aware
rules (like `no-unsafe-type-assertion`) additionally need `parserOptions.project` pointing
at a real `tsconfig.json`, which is slower per-run than a plain syntax lint.

**Currently seeded in this repo:** `@typescript-eslint/no-unsafe-type-assertion` — catches
type assertions (`as X`, including the `as unknown as X` double-cast pattern) that narrow a
value's type in a way TypeScript can't verify is actually safe. Added after a real breaking-
change test in this session showed `tsc --noEmit` alone missed a genuine breaking change to
`PublicVehicle` specifically because `src/lib/vehicles.ts` returns data through such a cast.
Baseline at seed time: 19 pre-existing warnings across 8 files (see `data/ledger.json`) —
none of those are flagged; only assertions introduced after that point are.

## Commands

```
agentdrift add "<statement>" [--tags=x,y] [--source=AGENTS.md|CLAUDE.md]
agentdrift add "<statement>" --type=lint-gate --rule=<eslint-rule-id> [--tags=x,y]
agentdrift list [--tags=x,y]
agentdrift remove <id>
agentdrift check <path-to-file>          # manual check, for testing
agentdrift check-hook                     # reads stdin JSON, used by the actual hook
agentdrift scan-source-files              # detect AGENTS.md/CLAUDE.md in cwd, flag conflict
agentdrift scan-tree                      # recursively scan monorepo for missing/conflicting pairs
agentdrift session-start-check            # same as scan-tree, meant for the SessionStart hook
agentdrift pending                        # flags awaiting manual true/false-positive judgment
agentdrift confirm <line> --status=true|false
agentdrift gate-status                    # Phase 1 pilot gate checklist
```
