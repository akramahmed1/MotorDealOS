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

## Gate criterion fix — "2+ distinct projects" (structural, not a policy choice)

`cmdGateStatus()` counted distinct projects from this repo's own `hits.log.jsonl`. Since the
ledger/log is vendored per-repo by design (so its data persists via that repo's own git
history, not a shared file), a single repo's log can **never** show 2+ projects — no number of
runs changes that. `gate-status` now reports pass/fail on the criteria a single repo's log can
actually verify (10+ runs, 1+ confirmed true positive, 0 confirmed false positives, all flags
judged), and reports "2+ distinct projects" as a separate cross-repo criterion that has to be
confirmed by a human comparing this repo's `gate-status` output against another repo's.

## MotorDealOS gate status (as of this session, after the fixes above)

- **41** runs logged.
- **3** flagged, all now judged: **1 confirmed true positive** (the deliberate Phase 2
  lint-gate scratch-file test), **2 confirmed false positives** (both the self-referential
  match above, now structurally fixed so it can't recur).
- Per-repo checklist: 10+ runs ✅ · 1+ confirmed true positive ✅ · all flags judged ✅ ·
  **zero confirmed false positives ❌** — 2 false positives are permanently on record even
  though the bug that caused them is fixed, because the criterion as written is a lifetime
  tally over the whole log, not "zero outstanding since the fix." **This repo's per-repo gate
  cannot pass under that reading, ever, regardless of future runs.** Whether "zero confirmed
  false positives" should reset after a confirmed fix, or stay a lifetime tally, is an open
  question for a human to decide — not resolved in this session.
- Cross-repo criterion (2+ distinct projects, per the fix above): not evaluated here — requires
  comparing against medai-platform's own `gate-status` output.

**Gate status: NOT PASSED**, and — pending the false-positive-tally question above — may not
be passable in this repo under the criterion as currently written.
