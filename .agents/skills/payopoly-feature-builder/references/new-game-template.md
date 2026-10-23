# Compact game / feature brief

Fill the relevant fields in a short message or working note. A file under `docs/games/` is useful for a lasting complex design, but is not required for every change. Replace placeholders with decisions; don't duplicate source data after implementation.

## Game

- Name / stable registry key(s): `<type>:<name>`
- Table moment / player payoff: one sentence.
- Core action and uncertainty: what the player chooses and why the outcome is not obvious.
- Variants to implement: Solo / Duel / Everyone; specify each separately.
- Roles and minimum players: contestants, captains/helpers, audience/judges; what each phone shows.
- Private → public information: what is hidden, who may see it, and when it is revealed.

## Round contract

| Phase | Who acts | Input / lock rule | Budget | Completion / missing-player exit |
| --- | --- | --- | --- | --- |
| Preparation | ... | ... | ... | ... |
| Play | ... | ... | ... | ... |
| Reveal / judging | ... | ... | ... | ... |
| Results | Controller / group | Shared payout | Shared recovery policy | Advance exactly once |

- Shared state: round/content/participant snapshot, phase start time, submitted decisions, attempts and results.
- Scoring: base awards, winner/head-to-head rule, ties, zero achievement, no ballots, incomplete submission; prediction/bounty interactions.
- One worked example: names, actions, a concrete die value, result and actual points. Match both languages.
- Recovery: reload, offline actor, new arrival, controller handoff, deadline/late write, simultaneous submissions.
- Content: curated and/or generated; localization, shape validation, fallback and repeat policy.
- Look / copy: immediate action, role, timer, feedback, reveal; reuse existing stage components.

## Delivery

- Integration: registry/meta → router → state/write/recovery helpers → UI → rules/example/scoring text → translations → wheel/catalog.
- Checks: pure edge cases; browser entry path + other roles + reload + result payout; mobile screenshot if visual behavior changes.
- Main risk and cheapest experiment: one concrete playtest or technical check.
- Decisions / assumptions that must reach the next step: at most three.
