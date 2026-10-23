# PayoPoly

A phone-friendly party game with 22 minigame variants, French and English interfaces, and AI-generated content with curated offline-service backups.

## Agent workflow

Coding agents start with [AGENTS.md](AGENTS.md). The [quick skill guide](docs/agent-playbook.md) explains the local game designer, creative director, game-math expert and feature builder workflows, their Quick/Deep modes, and when to use the installed React, verification and Vercel skills.

## Run locally

```sh
npm install
npm run dev
```

Vite serves the interface and proxies `/api` to the Express server on port 3001. Set `ANTHROPIC_API_KEY` in the environment or `.env.local` to enable generated prompts. No API key is needed for the curated fallback content. Firebase Realtime Database stores rooms; its configuration is in `src/firebase.js`.

## Playing

For a local two-player preview without Firebase or API requests, run `npm run demo` and open `http://localhost:5174/lobby/DEMO24?player=you`. The room starts with You and Alex ready, one round each and Quick play selected. Use the preview's **Play as Alex / You** button to control both seats, or open the same URL with `player=alex` in another tab. **Reset demo** starts a fresh session. Both tabs must use the same browser profile and origin to share the local room. This mode uses curated content and simulated presence; it does not create a live Firebase room.

- Create a room, share its invite link or QR code, and mark players ready.
- The host explicitly chooses 1, 3 or 5 rounds per player, Classic or Quick play, and French or English content. Interface language is saved separately on each device.
- Add up to three custom categories or use the suggested categories. Preparation advances after 90 seconds if anyone is absent.
- Every minigame starts with role, rules, scoring and an example. Players can reopen the current game's rules while playing.
- Quick play automatically selects Everyone games, spins and rolls; it favors simultaneous games and avoids long drawing reveal loops. Immediate minigame repeats are excluded in both presets.
- The die still sets difficulty and the per-player points budget. Crowd-dependent bonuses are scaled by group size and each player's total is capped at the die value. The only exceptions are a duel winner's Punchline sweep (double the die) and the leader bounty. Points may have one decimal place. Exact competitive ties share the reward; zero correct trivia answers earn nothing.
- Duels open on a face-off card showing ranks, points and the pair's head-to-head record. The opponent picker shows the same information and greys out the challenger's last opponent while others remain. A trailing challenger who picks the leader and wins earns +50% of the die (leader bounty). In Trivia the challenger offers two categories and the opponent picks one (auto-picked after 20 seconds); in Rimes Rapides the challenged player goes first.
- In objective duels (Trivia, Rimes Rapides, Choix Unique, Mémo Flash), spectators predict the winner before play. Picks stay hidden until kick-off. A correct pick earns half the die, or the full die if it went against the majority; ties pay no predictions. Judged duels (Petit Bac, Punchline) keep spectators as the judges, with no prediction. During any duel a bar shows both players, the stakes and the predictions, and spectators can send emoji reactions that float across every screen. Trivia spectators see each question revealed, with both picks, once both duellists have answered it.
- Trivia has a shared 60-second deadline. Voting is private until results and closes after its deadline, even with no votes. Other preparation phases have a 90-second recovery limit, results advance after 30 seconds, and the host/controller can explicitly skip a turn without awarding points.
- Disconnected hosts are replaced after a five-second grace period by a connected player. Presence tracks browser connections separately, with heartbeats and Firebase `onDisconnect`. Games keep each participant's seat through reloads, and typing the same name on another device reclaims a disconnected seat. New players can join a running game: they are added to the end of the turn order with one turn for each remaining round.
- Final standings and rematches retain the room and players but reset scores and session state.

The wheel also includes four short party rounds with curated content in both languages:

- **Choix Unique** (Everyone, 40 seconds): secretly choose a lane paying 50%, 75% or 100% of the die; only a lane’s sole occupant scores.
- **Mission Impossible** (Duel + audience, up to 75 seconds): two actors receive separate secret objectives in one improvised scene. The audience judges each mission; successful actors share the die if both succeed. Requires at least three players.
- **Code Commun** (Everyone, 65 seconds): combine private clues to solve one shared code with three team attempts. Success rewards every participant.
- **Mémo Flash** (Everyone, 40 seconds): study a randomized illustrated scene for 15 seconds, then answer three visual questions in 25 seconds. Each correct answer earns a third of the die.

All four new games are also on the **Duel** wheel. Choix Unique compares the two secret lane rewards; Mémo Flash awards the die to the best positive recall score (positive ties split it). In Code Commun, the duellists captain two teams, with private clues distributed to their teammates and three attempts per team; only captains submit, and the first correct code rewards every winning teammate. All three of these Duel variants work with two players. Mission Impossible needs a third player to judge.

Every wheel shows its full game list, with an explanation when a game is unavailable because of player count, the last round, or the preset. Tap any game in that list to open its rules. The instruction popup includes an explanation, numbered steps, a worked example, scoring and a tip for each new variant.

These rounds persist their participants, content, submissions and phase deadlines. Late submissions are rejected, and the active controller advances expired phases after reconnecting.

## Validation

```sh
npm run lint
npm test
npm run build
```

For the browser checks, start Vite (`npx vite --host 127.0.0.1 --port 5173`) and run `npm run test:browser` in another terminal. Run `npm run test:party-games` for the four new games’ three-player privacy, timeout, reload, scoring and mobile checks. The runner defaults to `/usr/bin/chromium`; set `PAYOPOLY_CHROMIUM` to your browser binary and `PAYOPOLY_TEST_URL` if Vite runs elsewhere.

Browser checks intercept Firebase with a test-only adapter and intercept AI requests, so they do not create production rooms or spend API credits. They cover all 22 intros/dice/help flows, creation, room settings, invite errors, resuming a seat, trivia reloads and timeouts, fallback content, final standings, rematches, host transfer and mobile layout. Unit checks cover the shared session/scoring rules and content validation.

Before publishing, verify real multi-device behavior against the deployment's Firebase access rules, including transactions and presence writes. Those external permissions are not represented by the simulated browser database.
