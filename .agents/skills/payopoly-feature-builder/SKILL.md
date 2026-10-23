---
name: payopoly-feature-builder
description: Efficient implementation of PayoPoly features and minigames. Use to turn a game brief into working multiplayer code, add a Duel/Everyone/Solo variant, fix game or instruction flows, validate behavior, or prepare an authorized release.
---

# Feature builder

## Working settings

- Role: senior React/Firebase multiplayer engineer with product judgment.
- Default: Quick, small diffs, high correctness; reuse the existing stack and components.
- Workflow: one brief, one implementation pass, targeted checks, one concise handoff. Broaden only for a real failure or unresolved risk.
- Use the current model; do not spawn agents or change model/permission settings automatically.

## Apply

1. Read root `AGENTS.md` and only the relevant source-map rows. Inspect the nearest existing game. Keep approved design decisions; don't re-run ideation for a specified feature.
2. For a new mechanic, fill missing details in [the game brief](references/new-game-template.md) using reasonable defaults. If the ambiguity changes the product substantially, ask one focused question while advancing independent work.
3. Define the state machine and pure transition/submission helpers before wiring the UI. Prefer the `src/lib/partyGames.js` pattern when it fits; give unrelated mechanics their own small module rather than expanding it blindly.
4. Persist the generated shared content, participants, phase starts and submissions. Generate randomness once. Validate role, round, phase, value, deadline and attempt budget inside the transaction. Recheck completion against current transaction state.
5. Wire each variant through registry/meta, router, wheel/catalog, roles, bilingual rule data, examples and canonical scoring copy. If the new name belongs in `PARTY_GAMES`, make sure the writer and recovery loop actually handle it. Add predictions only for suitable objective duels.
6. Reuse `PartyFrame`, `Countdown`, `MgHeader`, `RoundIntro`, `MinigameRulesPopup`, `DuelStage`, and the shared score summary as applicable. Keep UI drafts local; use shared state for decisions that survive reload.
7. Trace awards through `roundAwards` and `finishTurn`. Confirm that custom base awards still receive any eligible prediction/bounty once, respect caps, and produce the correct head-to-head winner.
8. Keep generated prompts behind `requestContent`, validate shapes, and provide curated content in both languages. An AI outage must not consume play time or strand a round. Don't add an AI service when curated content is enough.
9. Apply the relevant verification commands from `AGENTS.md`. Update applicable browser variant lists. Test the actual entry path, non-actor screen, private rendering, deadline, reload, final payout and phone layout for changed mechanics.
10. If a check fails, repair the authorized issue and rerun the affected checks. Avoid broad repeat runs after success. For a docs-only change, validate links and facts instead of running browsers.

## Installed skill support

Read these installed skills only when relevant and available:

- `vercel:react-best-practices` after substantive component changes: hooks/effects, subscriptions, accessibility, avoidable rerenders. Apply the React guidance to Vite/JSX; don't introduce Next.js, Tailwind or a component library as a side effect.
- `vercel:verification` for UI → transaction/API → data → result checks. Identify mocked boundaries; fix and resume when implementation work is authorized. Don't turn a passing mock into a claim about live Firebase rules.
- `vercel:deployments-cicd` for an authorized release; inspect commit, project, target, readiness and production aliases. Use `vercel:access-protected-vercel-deployment` if protection blocks a live check; do not disable protection.
- `vercel:ai-sdk` / `vercel:ai-gateway` only for actual AI SDK/Gateway work. PayoPoly currently uses the Anthropic SDK directly; reading these skills is not a reason to migrate it.

Installed-skill recommendations are applied within the user's scope and the existing stack. Do not stop at a test report or ask for approval again when the requested fix/release is already authorized.

## Done

The feature is discoverable, playable, localized, resilient to missing actors/reloads, and correctly scored. The rules popup explains it with an example. Relevant checks pass; limitations are stated. Commit/push/deploy only within current authorization and confirm any release rather than inferring it from a successful push.
