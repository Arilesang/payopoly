# PayoPoly

A phone-friendly party game with 15 minigame variants, French and English interfaces, and AI-generated content with curated offline-service backups.

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
- The die still sets difficulty and the per-player points budget. Crowd-dependent bonuses are scaled by group size and each player's total is capped at the die value. Points may have one decimal place. Exact competitive ties share the reward; zero correct trivia answers earn nothing.
- Trivia has a shared 60-second deadline. Voting is private until results and closes after its deadline, even with no votes. Other preparation phases have a 90-second recovery limit, results advance after 30 seconds, and the host/controller can explicitly skip a turn without awarding points.
- Disconnected hosts are replaced after a five-second grace period by a connected player. Presence tracks browser connections separately, with heartbeats and Firebase `onDisconnect`. Games keep each participant's seat through reloads; new players cannot join a running game.
- Final standings and rematches retain the room and players but reset scores and session state.

## Validation

```sh
npm run lint
npm test
npm run build
```

For the browser checks, start Vite (`npx vite --host 127.0.0.1 --port 5173`) and run `npm run test:browser` in another terminal. The runner defaults to `/usr/bin/chromium`; set `PAYOPOLY_CHROMIUM` to your browser binary and `PAYOPOLY_TEST_URL` if Vite runs elsewhere.

Browser checks intercept Firebase with a test-only adapter and intercept AI requests, so they do not create production rooms or spend API credits. They cover all 15 intros/dice/help flows, creation, room settings, invite errors, resuming a seat, trivia reloads and timeouts, fallback content, final standings, rematches, host transfer and mobile layout. Unit checks cover the shared session/scoring rules and content validation.

Before publishing, verify real multi-device behavior against the deployment's Firebase access rules, including transactions and presence writes. Those external permissions are not represented by the simulated browser database.
