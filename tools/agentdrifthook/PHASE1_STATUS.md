# AgentDriftHook — Phase 1 status (MotorDealOS)

## What Phase 1 catches

Grep-pattern conventions (the default/original convention type, `type: "grep-pattern"` or
the field omitted). On every Edit/Write, the tool keyword-matches the target file's content
against each grep-pattern convention's statement — a naive overlap heuristic, not AST or
semantic analysis. It flags for human review; it never blocks a tool call.

## Known precision fix

The original keyword-overlap matcher had a false-positive problem, fixed in medai-platform
at commit `3dacb1c` (reported to and confirmed in a prior session working in that repo, not
independently re-verified from inside MotorDealOS this session — MotorDealOS was not a
party to that fix or its validation). The fix moved matching toward literal grep-pattern
matching rather than loose keyword overlap, reducing spurious flags.

## Known limitation — why Phase 2 exists

Grep-pattern matching operates on text content, not program structure. It cannot detect:
- A breaking change to a shared TypeScript interface (confirmed in this session: removing
  `PublicVehicle.lot_location` in `src/lib/vehicle-types.ts` produced a real breaking change,
  but caused **zero new `tsc --noEmit` errors** — because the two real importers use a
  double-cast (`as unknown as PublicVehicle[]`) that bypasses structural type-checking).
- The type-safety bypass that made that possible in the first place — an unsafe type
  assertion. Catching that requires a type-aware tool, not a text-pattern match.

This is exactly the gap Phase 2 (lint-gate conventions) is built to close — see the
`lint-gate` convention type in `data/ledger.json` and the corresponding logic in
`bin/agentdrifthook.js`'s `runCheck()`.

## Self-referential false positive (found and fixed this session)

This file itself triggered the `a-chain-of-operations-is-done-when-the-sender-is-last-in-the`
grep-pattern convention twice (entries 35 and 37 in `data/hits.log.jsonl`), because it quoted
that convention's own rule text verbatim — a self-referential match, not a real violation.
Both were confirmed FALSE positives. Root cause: the grep-pattern matcher ran against every
file type, including this tool's own `.md` docs.

**Fix applied:** grep-pattern conventions now only run against real source-code extensions
(`GREP_PATTERN_EXTENSIONS` in `bin/agentdrifthook.js`: `.ts`, `.tsx`, `.js`, `.jsx`) — never
`.md`. Verified with disposable fixtures: a `.md` file quoting a convention verbatim no longer
flags; a `.ts` file with a genuine violation of a different convention still flags correctly.
This closes the whole self-referential-doc class, not just this one file.

**Convention retired:** `a-chain-of-operations-is-done-when-the-sender-is-last-in-the` has
now produced two confirmed false positives and zero true positives across every run in this
repo. Removed from `data/ledger.json` rather than left seeded — it has no natural site to
violate in this codebase (see prior investigation) and was the direct cause of the recurring
false positive above.

**Not silently ported to medai-platform.** medai-platform has its own copy of this tool and
its own separate false-positive history/fix (the keyword-overlap → literal-match change at
`3dacb1c`, referenced above). Whether the same `GREP_PATTERN_EXTENSIONS` restriction should
also go into medai-platform is a separate, real question — flagged for a human decision, not
applied here.

## Gate criterion fix — "zero false positives" is since-the-last-fix, not lifetime

A lifetime tally of confirmed false positives conflates "this matcher has a bug" with
"this matcher USED TO have a bug that's now fixed." The two entries above are evidence the
*old* matcher (which ran grep-pattern checks against `.md` files) was unreliable — not that
the *current* matcher (source-extensions only) is. Treating it as a lifetime tally means
finding and fixing your first real false positive permanently disqualifies the gate,
forever, no matter how many clean runs follow — which inverts the incentive: fixing bugs
faster only disqualifies you sooner. Same underlying problem as the "2+ distinct projects"
fix below, just the temporal version of it.

**Fix applied:** added `agentdrift resolve-fp <line> --fix="<description>"`, which tags a
confirmed false positive with the fix that addressed it, without deleting or rewriting what
happened. `gate-status` now counts only **unresolved** false positives toward "zero false
positives"; resolved ones stay fully visible via `agentdrift list-false-positives`, tagged
with which fix resolved them. Both entries above are now marked resolved (fix: commit
`5f828c8`).

**Guardrail worth naming:** this mechanism trusts whoever runs `resolve-fp` to have actually
shipped a real fix, not to preemptively wave away an ongoing problem. It's a judgment tool,
not a hard gate — same posture as `confirm` itself.

**Audited for a third instance of this bug class** (per Akram's ask, rather than finding
issues one at a time under pressure to merge): reread all remaining criteria — "10+ runs"
(a plain threshold, no tally-of-judgment problem), "≥1 confirmed true positive" (correctly
lifetime — a real catch doesn't stop being true), and "all flags judged" (a live snapshot,
not an accumulating tally, so it can't develop the same permanent-debt problem). Also
checked all 47 log entries for schema drift (a missing `confirmed` key would silently fall
through both the pending and false-positive counts) — none found. No third instance of
this bug class found. One separate, already-disclosed limitation worth repeating here: a
lint-gate convention's baseline is snapshotted once at add-time and never ratchets down, so
a violation introduced, flagged, and then fixed leaves that file's baseline at the old
(higher) count permanently — a similar future violation there could slip in unflagged. This
is a different category (a detection-mechanism gap, not a merge-blocking gate criterion).

## Gate criterion fix — "2+ distinct projects" (structural, not a policy choice)

`cmdGateStatus()` counted distinct projects from this repo's own `hits.log.jsonl`. Since the
ledger/log is vendored per-repo by design (so its data persists via that repo's own git
history, not a shared file), a single repo's log can **never** show 2+ projects — no number of
runs changes that. `gate-status` now reports pass/fail on the criteria a single repo's log can
actually verify (10+ runs, 1+ confirmed true positive, 0 confirmed false positives, all flags
judged), and reports "2+ distinct projects" as a separate cross-repo criterion that has to be
confirmed by a human comparing this repo's `gate-status` output against another repo's.

## MotorDealOS gate status (as of this session, after all fixes above)

- **47** runs logged.
- **3** flagged, all judged: **1 confirmed true positive** (the deliberate Phase 2 lint-gate
  scratch-file test), **2 confirmed false positives**, both now marked **resolved** (fix:
  commit `5f828c8`, which restricted grep-pattern matching to real source extensions).
- Per-repo checklist: 10+ runs ✅ · 1+ confirmed true positive ✅ · zero UNRESOLVED false
  positives ✅ (2 resolved, 0 unresolved) · all flags judged ✅.
- **Per-repo criteria: PASSED.**
- Cross-repo criterion (2+ distinct projects, per the fix above): not evaluated here — requires
  comparing against medai-platform's own `gate-status` output. This is the only remaining
  criterion standing between "per-repo passed" and "full Phase 1→2 gate passed."

**Gate status: per-repo PASSED, full gate pending the cross-repo comparison above.**
