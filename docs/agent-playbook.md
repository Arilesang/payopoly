# Quick guide to PayoPoly agent skills

[AGENTS.md](../AGENTS.md) is the project entry point for future coding sessions. The four local skills live in `.agents/skills/`, the standard repository skill location. They travel with the repo. A session can follow the file links from `AGENTS.md`; clients that support local skill discovery also expose their `$skill-name` invocation. A newly added skill may need a new session to appear in a client's skill picker.

These roles describe how the assistant works. They are not separate models, installed expert people, temperature settings, background agents or permission changes. They use the current session's model and tools. No automatic subagent fan-out.

## The four roles and settings

| Skill | Role / default settings | Use when | Quick output |
| --- | --- | --- | --- |
| [payopoly-game-designer](../.agents/skills/payopoly-game-designer/SKILL.md) | Expert party-game designer; high mechanic creativity, low rule complexity | New idea, variant, engagement or replayability | Up to 3 distinct options, 1 recommendation and a playable brief |
| [payopoly-creative-director](../.agents/skills/payopoly-creative-director/SKILL.md) | Creative director; high thematic originality, restrained UI, French + English | Names, themes, rules copy, illustration, reveal and phone layout | 1 cohesive direction with concrete copy/visual changes |
| [payopoly-game-math](../.agents/skills/payopoly-game-math/SKILL.md) | Applied math expert; rigorous incentives, probability and payout analysis | Scoring, chance, ties, teams, predictions, fairness or exploits | Assumptions, a formula/table, up to 3 material risks and a fix |
| [payopoly-feature-builder](../.agents/skills/payopoly-feature-builder/SKILL.md) | Senior multiplayer developer; small diffs, shared patterns, high correctness | Implement, integrate, fix, verify, prepare an authorized release | Working feature, relevant checks and concise handoff |

**Quick is the default:** reuse known decisions, load only the relevant skills, propose one direction, and test the actual risk. There is no mandatory brainstorming/report/approval cycle for a straightforward feature or bug fix.

**Deep is opt-in or risk-driven:** more alternatives, exact enumeration or seeded simulation, additional prototypes or broader verification when the task warrants them. Extra thought does not imply extra agents or a model switch.

## How to ask

Use natural language; `AGENTS.md` routes the task. Explicit skill names can help when you want one perspective:

- **Brainstorm:** “Use $payopoly-game-designer. Suggest three non-word games for 4–8 players, 45 seconds each. Pick the strongest.”
- **Creative polish:** “Use $payopoly-creative-director. Make Code Commun's reveal more exciting, keeping its scoring and both languages.”
- **Balance:** “Use $payopoly-game-math. Check Choix Unique for dominant strategies and compare expected rewards at 2, 4 and 8 players. State your assumptions.”
- **Build:** “Use $payopoly-feature-builder. Implement the agreed game, including rules, examples, Duel/Everyone variants and relevant tests.”
- **Full flow:** “Create and implement one 60-second Everyone game about bluffing, with a real Duel variant. Use Quick mode: design, give it a creative direction, check the math, then build and verify it.”
- **Focused fix:** “Fix the memory scene being hidden by the rankings button. Keep mechanics unchanged.” The builder is enough; don't repeat all design stages.

For a full feature, reuse [one compact brief](../.agents/skills/payopoly-feature-builder/references/new-game-template.md) from concept through implementation. If implementation is requested, continue to code and checks rather than ending after the pitch.

## Installed skills that support this workflow

These are already present in the connected skill catalog at setup time; future sessions should discover current availability and read only the relevant skill.

| Installed skill | When it helps PayoPoly | Boundary |
| --- | --- | --- |
| `vercel:react-best-practices` | Review component lifecycles, state, accessibility and performance | Apply React guidance to the existing Vite/JSX/CSS stack; no incidental framework migration |
| `vercel:verification` | Trace a feature through browser, transaction/API, data and result | Mocked Firebase/content checks do not establish live permissions; fix authorized issues and resume |
| `vercel:deployments-cicd` | Inspect, deploy or promote an authorized release | Verify the requested project, exact commit, production readiness and aliases |
| `vercel:access-protected-vercel-deployment` | Test a protected Vercel URL | Use supported authentication; preserve deployment protection |
| `vercel:ai-sdk` / `vercel:ai-gateway` | Work that intentionally uses those AI products | Existing Anthropic requests and curated content do not require a migration |
| `cloud-environment:cloud-environment-runtime` | Runtime, network and credential diagnosis | Inspect readiness without printing secrets |
| `plugin-management:plugin-management` | An external capability is genuinely missing | Check existing tools before adding integrations |

Sites and Work Pets remain useful for their own products, but aren't the implementation workflow for this React/Firebase game.

## Fast delivery examples

- New game: designer → creative director if needed → math if incentives/rewards change → builder → relevant checks.
- New variant: designer resolves roles/outcome → math checks rewards/teams → builder integrates the variant everywhere.
- Visual/copy change: creative director → builder → targeted language/accessibility/mobile review.
- Scoring bug: math → builder → pure rules tests plus the affected final payout path.
- Production issue: builder + installed verification; deployment skill only when release work is authorized.
- Docs-only change: verify facts, links and diff. Skip browsers and full app builds.

A good handoff says what changed, which checks ran, what remains unverified, and where to play if released. Keep durable decisions in code, rules, this guide or `AGENTS.md`; don't turn these files into a growing chat transcript.
