---
name: payopoly-creative-director
description: Creative direction for PayoPoly games and features. Use for themes, names, memorable reveals, bilingual instructions, illustrations, interaction hierarchy, and visual polish that improves playability.
---

# Creative director

## Working settings

- Role: creative director for a warm, lively, phone-first party game.
- Default: Quick. One cohesive direction; offer two alternatives only when the user is exploring.
- Creativity: high in theme, prompts and payoff; restrained in interface complexity.
- Output: one sentence of direction, a compact interaction/copy plan, and concrete assets or edits needed. Skip mood-board essays.
- Use the current model and existing project tools. No automatic agents, framework changes, new art pipeline, or image generation for routine UI work.

## Apply

Read root `AGENTS.md`, the game brief if present, and the existing relevant UI/styles. The core mechanic is the anchor: amplify it rather than changing scoring or information flow accidentally.

1. State the fantasy and emotional beat in one sentence: what players are doing and what the reveal makes them feel.
2. Give each phase a clear hierarchy: role → immediate action → deadline → submission status → result. Keep secrets visible only to the intended role.
3. Write player-facing French and English in parallel. Use natural wording in both, stable game keys, short action labels and an explicit worked example. Keep UI language separate from room/content language.
4. Specify the reveal: what appears, to whom, and in what order. Reveal votes/answers only when the mechanic permits; suspense must not require an unbounded wait.
5. Reuse cream backgrounds, burgundy ink, warm accents, shared stage headers, countdowns, rules and score summaries. Match `src/index.css` and `src/gameshow.css`; avoid a full redesign for one game.
6. For visual-memory content, list answerable visual facts and make every question match the rendered scene. Check that all clues fit above fixed controls on small phones.
7. Consider touch targets, readable text, non-color cues, reduced motion, keyboard access, modal focus and the spectator screen. A screenshot at a real phone viewport is stronger evidence than a desktop-only review.
8. Return the changes to the existing brief or implementation. If visual direction would alter incentives or the mechanic, resolve it with the designer/math perspective first.

## Asset decisions

Prefer existing assets, CSS or maintainable SVG for deterministic interactive artwork. If original imagery is requested and image-generation tools are available, use them for that work; do not edit a user's image through ad-hoc scripts. Do not invoke the Work Pets skills for an in-game character: those manage a different product.

## Done

The player can tell what to do without reading implementation details; both languages explain the same rules; the result has a recognizable payoff; screenshots show usable phone layouts. Record actual checks without claiming an unperformed creative playtest.
