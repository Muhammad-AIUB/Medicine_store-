# TODOS

## T-001: Verify regulatory scope for online OTC sales (LAUNCH BLOCKER)

- **What:** Confirm with DGDA / a local pharmacist / a lawyer whether selling
  OTC and wellness items online in the target market (assumed Bangladesh)
  requires any license or registration. Document the answer here.
- **Why:** The entire v1 premise is "OTC is sellable without a pharmacy
  license" — that is assumed, not established. Blocks LAUNCH, not build.
- **Pros:** Removes the highest-stakes unknown in the project.
- **Cons:** None — one conversation or email.
- **Context:** Design doc Open Question 3 + Dependencies
  (`~/.gstack/projects/e-com/mdjub-nogit-design-20260715-211009.md`).
  Incumbent MedEasy publicly displays a DGDA drug license (DC-22112), which
  suggests licensing matters in this space even beyond Rx.
- **Depends on / blocked by:** Nothing. Blocks launch and T-002.
- **Added:** 2026-07-15 (plan-eng-review)

## T-002: Decide the Rx-search empty state

- **What:** Decide what a customer sees when searching a prescription
  medicine name (e.g. "Seclo") that v1 deliberately does not sell: total
  silence, or a generic "prescription items aren't sold online yet — call
  us" notice with no product/price listed.
- **Why:** Outside-voice review flagged that silence can make the store look
  empty/broken to chronic-medicine customers — the segment that matters most
  for v1.5 (refill wedge).
- **Pros:** Small UX/legal decision preserved with reasoning before the
  search feature ships.
- **Cons:** Not urgent until the client search UI is built.
- **Context:** Design doc Open Question 5. Rx items were removed from v1
  display entirely for legal caution (premise 2); a text-only notice is
  probably safe but verify against the T-001 answer.
- **Depends on / blocked by:** T-001 (regulatory answer bounds what can be
  displayed).
- **Added:** 2026-07-15 (plan-eng-review)
