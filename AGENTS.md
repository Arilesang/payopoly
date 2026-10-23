# PayoPoly agent guide

Build party games that are quick to understand, fun around a table, and reliable across phones. Read this file first; load only the skill and source files needed for the current task. The user's instructions and existing authorization take precedence over this guide.

## Start efficiently

1. Check `git status --short --branch`, `package.json`, and the relevant diff. Preserve unrelated work.
2. Identify the requested outcome: explore, design, implement, fix, balance, or release. A request to implement means deliver working code and checks, not just a proposal.
3. Read the closest existing game and its pure rules before inventing infrastructure. Use `rg` and batch independent reads.
4. State a short assumption if needed. Ask only about choices that materially change the outcome; keep independent work moving.
5. Default to **Quick** mode: one recommendation, one focused implementation, one relevant verification pass. Use **Deep** only for a requested exploration or unresolved risk.

## Skills: route by need

These are reusable perspectives for the current assistant, not a requirement to spawn agents or change models. Do not spawn subagents unless the user explicitly requests them. Settings below describe working style; they do not configure model sampling, permissions, or the app.

| Task | Load |
| --- | --- |
| Invent a game, design a variant, improve the party payoff | [.agents/skills/payopoly-game-designer/SKILL.md](.agents/skills/payopoly-game-designer/SKILL.md) |
| Theme, names, copy, visual direction, make a concept memorable | [.agents/skills/payopoly-creative-director/SKILL.md](.agents/skills/payopoly-creative-director/SKILL.md) |
| Rewards, odds, ties, team balance, exploits, difficulty | [.agents/skills/payopoly-game-math/SKILL.md](.agents/skills/payopoly-game-math/SKILL.md) |
| Build a feature/game, repair multiplayer behavior, integrate a variant | [.agents/skills/payopoly-feature-builder/SKILL.md](.agents/skills/payopoly-feature-builder/SKILL.md) |

For a new game, use designer → creative direction where needed → math for scoring decisions → builder. Pass the same compact game brief through each perspective; do not repeat the analysis or produce four reports. A known UI fix usually needs only the builder. See [the short usage guide](docs/agent-playbook.md) for prompts and installed-skill routing.

## Product decisions to preserve

- Phone-first, in-person social play; French and English. Prefer simultaneous participation and something meaningful for the audience.
- Solo, Duel and Everyone are separate **variants**, keyed as `${type}:${name}`. Explicitly decide which variants to ship; never assume an Everyone game automatically belongs on Duel.
- Most quick rounds target roughly 35–75 seconds of active play; specify preparation, play, reveal and judging budgets separately. Keep existing games' intended durations unless changing them is the task.
- Rules need a clear explanation, steps, a concrete example, scoring, and a tip. Say who plays, what is private, what spectators do, and how ties/timeouts work.
- Keep the warm game-show style: cream paper, burgundy ink, orange/gold accents, readable type, concise copy. Reuse the CSS and shared components.
- Define `minPlayers` from the minimum viable roles, including judges. Mission Impossible needs two actors and a judge. Unavailable games remain discoverable through the wheel catalog with a reason.
- Quick play favors simultaneous Everyone games; immediate repeats are excluded. Do not bypass wheel eligibility to make a game appear.

## Source map — read the relevant row

| Concern | Source of truth / starting point |
| --- | --- |
| Registry, variants, minimum players, prediction eligibility | `src/gameConfig.js` |
| Eligible wheel slices and visible availability reasons | `wheelGames` / `wheelCatalog` in `src/lib/session.js`, `src/components/WheelGameList.jsx` |
| Component routing, rules/dice/results wrapper | `src/minigames/index.jsx` |
| Shared room state, transactions, controller recovery | `src/context/GameContext.jsx` |
| Party-game initialization, validated submissions, timed transitions | `src/lib/partyGames.js`; use this pattern when the mechanic fits |
| Per-player caps, awards, predictions, bounty, idempotent turn completion | `src/lib/session.js` |
| Other specialized pure mechanics | `src/lib/petitBac.js`, `src/lib/rankings.js` |
| Game UI and reusable stage elements | `src/minigames/`, `src/components/`; start with `PartyFrame.jsx` for party rounds |
| Explanation, steps, tip and rules metadata | `src/data/minigameRules.js` |
| Worked round examples and canonical scoring copy | `src/data/roundExamples.js`, `src/lib/rules.js` |
| Instruction popup and intro | `src/components/MinigameRulesPopup.jsx`, `src/components/RoundIntro.jsx` |
| UI language, game-name translations | `src/context/LangContext.jsx`, `src/i18n/`, `src/context/useText.js` |
| Localized curated game content | `src/data/partyGames.js`, other `src/data/` modules |
| AI requests, shape validation and curated fallback | `src/lib/content.js`, `server/index.js`; production entry `api/index.js` |
| Shared clock, identity, browser presence | `src/lib/clock.js`, `src/lib/identityStorage.js`, `GameContext.jsx` |
| Visual style | `src/index.css`, `src/gameshow.css` |
| Safe preview / browser database adapter | `src/demo/`, `tests/firebase-browser-mock.js` |

## New game / variant definition of done

Use [the game brief](.agents/skills/payopoly-feature-builder/references/new-game-template.md) for a nontrivial mechanic. Fill it concisely; don't require a design document for a small fix.

1. Define roles, minimum players, secret/public information, phase deadlines, scoring and spectator participation.
2. Add every implemented variant to **both** registry/meta and component routing. Wire prediction eligibility only if spectators do not judge or help a competing team.
3. Put mechanics and payout decisions in pure helpers. Generate shared random content once and persist it with the round, not independently on each phone.
4. Validate submissions inside the transaction: round, phase, actor, shape, deadline, and any one-shot or attempt budget. Controller transitions must re-read current state so competing clients cannot both win.
5. Persist participants, submissions, phase start times, and generated content. Keep local React state for unsubmitted UI drafts. Reloads, missing actors and controller handoffs must not strand a round.
6. Use the shared clock and recovery loop. A countdown display alone does not enforce deadlines. Every waiting phase needs an explicit exit.
7. Route payout display and completion through `roundAwards` / `cleanAwards` / `finishTurn`. Do not award points from a component or count a bonus twice.
8. Add bilingual rules, scoring text, examples, game-name translations and relevant role text. Confirm direct wheel help and the global Duel/Everyone filter both find the variant.
9. Verify the changed mechanic and full user path, including non-actors and mobile layout. Explain what was tested and the limits of mocks.

## Scoring and multiplayer invariants

- Each player's ordinary payout is capped by the die; fixed scoring uses a base of 10. Only existing explicit exceptions apply: Punchline's qualifying sweep and the challenger leader bounty. New exceptions require a deliberate product decision, not an incidental formula.
- Points support one decimal. Use shared rounding/caps; compare underlying scores before presentation rounding. Define positive ties, zero achievement, no ballots, abstentions, and partial submissions.
- Group-size growth must not accidentally multiply a player's earning opportunity. Team rewards and spectator rewards must be designed explicitly.
- Objective spectators may predict; judges and helpers on a competing team should not also bet on that result. Check `PREDICTION_DUELS` and `PRE_PLAY_PHASES`.
- UI hiding is not database authorization. The current shared room snapshot can contain secrets; visibility tests prove rendering behavior, not protection against a modified client. If adversarial secrecy is required, design and verify backend access rules.
- Never write test games to live Firebase or spend API credits as an incidental browser check. Use the adapters/fallbacks unless real-service testing is explicitly in scope.

## Commands and proportionate verification

| Need | Command / action |
| --- | --- |
| Install exactly the lockfile when dependencies are missing | `npm ci` |
| Full local app | `npm run dev` — Vite UI plus Express API on 3001 |
| Offline-service two-seat preview | `npm run demo` then `/lobby/DEMO24?player=you` on port 5174 |
| Pure rules / scoring / session changes | `npm test`; diagnose an individual file with `node tests/partyGames.test.js` or the relevant file |
| Application source changes | `npm run lint` and `npm run build`, plus relevant behavior checks |
| Browser test server | `npx vite --host 127.0.0.1 --port 5173` |
| App flow, variants, intros, help, lobby regressions | `npm run test:browser` |
| Shared displays, privacy rendering, dice, wheel reload | `npm run test:visibility` |
| Party games, Duel variants, catalogs, rules, scoring, mobile | `npm run test:party-games` |
| Written Petit Bac behavior | `npm run test:petit-bac` |

Browser tests use Playwright and `/usr/bin/chromium` by default. Override `PAYOPOLY_CHROMIUM` or `PAYOPOLY_TEST_URL` when needed. They intercept Firebase/content requests; passing them does not verify deployed Firebase permissions. Add new variants to applicable browser variant lists. Inspect actual mobile screenshots when layout or illustrated clues change; fixed rankings controls must not hide timed content.

For documentation-only changes, check paths, examples, commands and `git diff --check`; do not run the entire game suite. For implementation, stop broadening tests once the relevant checks pass unless a new change or failure justifies another pass.

## Installed skills and tools

Discover availability in the current session; use the provider's skill reader for cloud skills. Read only the relevant skill, not the whole catalog.

- `vercel:react-best-practices`: targeted hooks, lifecycle, accessibility and performance review after meaningful React changes. This is a Vite/JSX/CSS project: Next.js/RSC examples and framework migrations are not defaults here.
- `vercel:verification`: trace the changed user story across UI → transaction or API → state → result. Repair an authorized issue and resume verification; don't stop at merely describing the first failure.
- `vercel:deployments-cicd`: inspect and release to Vercel when deployment is in scope. `vercel:access-protected-vercel-deployment` applies if protection blocks testing; preserve access controls.
- `vercel:ai-sdk` / `vercel:ai-gateway`: only for changes that actually use or intentionally introduce these products. Existing content uses the Anthropic SDK and curated fallback; do not migrate it just to use a skill.
- Cloud runtime and plugin management skills: use for environment/access problems or a genuinely missing external capability. Sites and Work Pets are separate products; don't apply them to this existing app because it happens to be a game.

## Git, release and handoff

- Remote is `https://github.com/Arilesang/payopoly.git`. Check branch and remote main before pushing; never force-push shared history or overwrite unrelated changes.
- Push/deploy when the user requested it or existing session authorization covers it. Do not ask again for an already-authorized release; do not infer indefinite production authorization in a new, unrelated session.
- Main is connected to Vercel projects `payopoly` and `payopoly-hxgn`. Production aliases are `https://payopoly.vercel.app` and `https://payopoly-hxgn.vercel.app`. Verify the requested project(s), commit, production target, `READY` state and alias mapping; a push alone is not proof of release.
- Use the Vercel connection's discovered scope. Treat access denials as access problems; don't change protection settings, expose credentials, or invent deployment IDs.
- For a live update, tell players to refresh every device. Existing tabs can run an older bundle against a newer round.
- Final response: outcome, relevant checks, material limitations, and commit/live link if applicable. Keep it short. Update these docs only when durable architecture, workflow or constraints change; don't append a session diary.
