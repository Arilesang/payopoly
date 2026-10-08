import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fallbackContent } from '../src/lib/content.js';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PAYOPOLY_CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mock = await readFile(new URL('./firebase-browser-mock.js', import.meta.url), 'utf8');
await context.route(/\/node_modules\/\.vite\/deps\/firebase_database\.js/, r => r.fulfill({ contentType: 'text/javascript', body: mock }));
await context.route('**/api/**', async r => {
  const language = r.request().postDataJSON()?.language ?? 'fr';
  await r.fulfill({ json: { ...fallbackContent(new URL(r.request().url()).pathname, language), fallback: true } });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const origin = process.env.PAYOPOLY_TEST_URL ?? 'http://127.0.0.1:5173';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function state() { return page.evaluate(() => JSON.parse(localStorage.getItem('payopoly-test-db') ?? '{}')); }
async function patchRoom(fn) {
  const current = await state(); const code = Object.keys(current.games)[0]; fn(current.games[code]);
  await page.evaluate(data => { localStorage.setItem('payopoly-test-db', JSON.stringify(data)); window.__testEmit?.(); }, current);
}
async function expectText(text) { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 }); }
async function until(predicate) { for (let i = 0; i < 80; i++) { if (await predicate()) return; await wait(100); } throw new Error('Timed out waiting for state'); }
try {
  await page.goto(origin);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Create a game', exact: true }).click();
  await page.getByLabel('Enter your name').fill('Host');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expectText('Waiting Room');
  const created = await state(); const code = Object.keys(created.games)[0]; const hostId = created.games[code].hostId;
  assert.equal(created.games[code].settings.rounds, null);
  await page.getByRole('button', { name: '1 round', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await patchRoom(r => { r.players.guest = { name: 'Guest', ready: true, points: 0 }; r.presence.guest = { test: { online: true, lastSeen: Date.now() } }; });
  await page.getByRole('button', { name: 'Ready!', exact: true }).click();
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expectText('Preparation Phase');
  await page.getByRole('button', { name: 'Use suggested categories', exact: true }).click();
  await patchRoom(r => { r.players.guest.categoriesSubmitted = true; });
  await until(async()=> (await state()).games[code].status === 'play');
  await patchRoom(r => { r.currentTurn.playerId=hostId; r.playerOrder=[hostId,'guest']; });
  await expectText('Choose a mini-game type');
  assert.equal((await state()).games[code].totalTurns, 2);
  // Seed each implemented minigame at the same actual route and exercise the intro and dice.
  const variants = [['solo','Petit Bac'],['duel','Petit Bac'],['duel','Trivia'],['all','Trivia'],['all','Mimes'],['all','Pictionary'],['solo','Mot Melangés'],['all','Sondage Éclair'],['all','Mot Interdit'],['duel','Punchline'],['all','Bluff'],['all','Le Curseur'],['all','Qui a écrit ça'],['duel','Rimes Rapides'],['all','Croquis Croisés']];
  for (const [type, name] of variants) {
    await patchRoom(r => {
      r.players.spectator = { name: 'Spectator', points: 0, categories: ['Animals'] };
      r.presence.spectator = { test: { online: true, lastSeen: Date.now() } };
      r.status='play'; r.turnsPlayed=0; r.totalTurns=6; r.currentMinigame=null;
      r.currentTurn = { id: `test:${type}:${name}`, playerId: hostId, phase:'playing', minigameType:type, minigame:name, opponentId:type==='duel'?'guest':null, startedAt:Date.now() };
    });
    await page.goto(`${origin}/game/${code}/minigame`);
    await expectText('How to play');
    await page.getByRole('button', { name: 'Got it · ready!' }).click();
    await patchRoom(r => { r.currentMinigame.rulesReady = Object.fromEntries(Object.keys(r.players).map(id => [id,true])); });
    await page.getByRole('button', { name: 'Roll the die', exact:true }).waitFor();
    await page.getByRole('button', { name: 'Rules and help',exact:true }).click();
    await expectText('The mini-games');
    await page.getByRole('button', {name:'Close',exact:true}).last().click();
    await page.getByRole('button', { name: 'Roll the die', exact:true }).click();
    await until(async()=> (await state()).games[code].currentMinigame.phase !== 'dice');
    assert.ok(!errors.length, `${type}:${name}: ${errors.join(',')}`);
    console.log(`PASS intro/dice/help: ${type}:${name}`);
  }
  // Simulate an API failure, then reload trivia after answering question one.
  await context.route('**/api/trivia', r => r.fulfill({ status:500, json:{ error:'offline' } }));
  await patchRoom(r => { r.currentTurn={id:'trivia:reload',playerId:hostId,phase:'playing',minigameType:'all',minigame:'Trivia',startedAt:Date.now()};r.currentMinigame={id:'trivia:reload',type:'all',name:'Trivia',tPlayerId:hostId,phase:'ready_check',phaseStartedAt:Date.now(),diceValue:6,pointsValue:6,category:'Animals',difficulty:2,loadingContent:true,readyPlayers:Object.fromEntries(Object.keys(r.players).map(id=>[id,true]))}; });
  await page.goto(`${origin}/game/${code}/minigame`);
  await expectText('Q1/3'); await expectText('Backup content');
  const q = (await state()).games[code].currentMinigame.triviaQuestions[0];
  await page.getByRole('button', { name: new RegExp(q.options[0]) }).click();
  await expectText('Q2/3');
  await page.reload(); await expectText('Q2/3');
  // Bounded trivia resolves absent respondents; no guessed answer earns points.
  await patchRoom(r => { r.currentMinigame.countdownStartedAt=Date.now()-61000;r.currentMinigame.triviaAnswers={}; });
  await expectText('No correct answers');
  await patchRoom(r => { r.turnsPlayed=r.totalTurns-1; });
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expectText('Final standings');
  await page.getByRole('button',{name:'Play again with this group'}).click();
  await expectText('Waiting Room'); assert.equal((await state()).games[code].status,'lobby');
  // Invite URL prepopulates the room and join errors appear beside the form.
  await page.goto(`${origin}/?join=BAD999`);
  assert.equal(await page.getByLabel('Room code').inputValue(),'BAD999');
  await page.getByLabel('Enter your name').fill('New player');
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expectText('Game not found. Check the code.');
  await page.goto(`${origin}/?join=${code}`);
  await page.getByLabel('Enter your name').fill('Returning host');
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expectText('Waiting Room'); assert.equal(Object.keys((await state()).games[code].players).length,3);
  // A disconnected host transfers host authority to the connected player.
  await patchRoom(r => { r.hostId='guest';r.presence.guest={test:{online:false,lastSeen:Date.now()}};r.presence.spectator={test:{online:false,lastSeen:Date.now()}}; });
  await until(async()=> (await state()).games[code].hostId === hostId);
  // Full-vote ties share rewards, and two synchronous Continue clicks advance once.
  await patchRoom(r => {
    r.players.spectator2={name:'Spectator 2',points:0};
    r.status='play';r.turnsPlayed=0;r.totalTurns=6;r.settings.preset='classic';r.sessionId='checks';r.playerOrder=[hostId,'guest','spectator','spectator2'];r.initialPlayerCount=4;
    r.players[hostId].points=0;r.players.guest.points=0;
    r.currentTurn={id:'vote:tie',playerId:hostId,phase:'playing',minigameType:'duel',minigame:'Petit Bac',startedAt:Date.now()};
    r.currentMinigame={id:'vote:tie',type:'duel',name:'Petit Bac',tPlayerId:hostId,pPlayerId:'guest',phase:'voting',phaseStartedAt:Date.now(),diceValue:4,pointsValue:4,votes:{spectator:hostId,spectator2:'guest'}};
  });
  await page.goto(`${origin}/game/${code}/minigame`);
  await expectText('Tie: points are shared.');
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Continue');b.click();b.click(); });
  await until(async()=> (await state()).games[code].turnsPlayed === 1);
  await expectText('Turn 2/6');
  let after=(await state()).games[code];assert.equal(after.turnsPlayed,1);assert.equal(after.players[hostId].points,2);assert.equal(after.players.guest.points,2);
  // No-vote expiry is a complete, neutral result rather than an indefinite wait.
  await patchRoom(r=>{r.currentTurn={id:'vote:empty',playerId:hostId,phase:'playing',minigameType:'all',minigame:'Mimes',startedAt:Date.now()};r.currentMinigame={id:'vote:empty',type:'all',name:'Mimes',tPlayerId:hostId,phase:'voting',phaseStartedAt:Date.now()-26000,diceValue:4,pointsValue:4,votes:{}};});
  await page.goto(`${origin}/game/${code}/minigame`);await expectText('No points awarded.');
  // Quick mode automatically chooses a simultaneous game, spins and rolls.
  await patchRoom(r=>{r.settings.preset='quick';r.currentTurn={id:'quick:auto',playerId:hostId,phase:'choose_type',startedAt:Date.now()};r.currentMinigame=null;});
  await page.goto(`${origin}/game/${code}`);await expectText('How to play');
  await patchRoom(r=>{r.currentMinigame.rulesReady=Object.fromEntries(Object.keys(r.players).map(id=>[id,true]));});
  await until(async()=>{const mg=(await state()).games[code].currentMinigame;return mg&&mg.phase!=='rules'&&mg.phase!=='dice';});
  assert.equal((await state()).games[code].currentTurn.minigameType,'all');
  console.log('PASS tie payouts/double Continue/no-vote timeout/quick autoplay');
  await page.screenshot({ path:'/tmp/payopoly-lobby.png',fullPage:true });
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS create/join/invites/reload/timeouts/standings/rematch/host takeover/mobile layout');
} catch (error) { console.error('Browser state at failure:', JSON.stringify(await state())); console.error('UI:', await page.locator('body').innerText()); console.error('Page errors:', errors); throw error; } finally { await browser.close(); }
