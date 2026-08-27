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

## MotorDealOS gate status (as of this session)

Two distinct pictures, kept separate rather than blended:

**Phase 1 (grep-pattern) alone, before Phase 2 was implemented in this session:**
27 runs logged, 0 ever flagged, 0 confirmed true positives, 0 confirmed false positives.
The one grep-pattern convention in the ledger (`a-chain-of-operations-is-done-when-the-
sender-is-last-in-the`) has no natural site in this codebase to violate — see the session
record for that investigation. No genuine true positive has been produced by the
grep-pattern mechanism in MotorDealOS.

**Combined (Phase 1 + Phase 2), after this session's work:**
35 runs logged, 1 flagged (from a deliberate, real Phase 2 lint-gate test — a scratch file
introducing a genuine new unsafe type assertion, created and deleted within this session
to prove the hook fires end-to-end via the real PostToolUse wiring, not invoked manually).
That flag is unreviewed as of this writing — see `data/hits.log.jsonl` and run
`agentdrift pending` for the current queue.

Gate checklist (10+ runs, 2+ projects, 1+ confirmed true positive, 0 confirmed false
positives, no flags left pending) is **not met**: MotorDealOS has only ever run in one
project, and the one real flag produced so far has not yet been confirmed true or false.
