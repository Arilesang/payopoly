import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { memoQuestions } from '../data/partyGames';
import MemoScene from '../components/MemoScene';
import { TallyLine } from '../components/MgHeader';
import PartyFrame from './PartyFrame';

export default function MemoFlash() {
  const { game, myPlayerId, setMyEntry } = useGame();
  const { say } = useLang();
  const [answers, setAnswers] = useState([null, null, null]);
  const mg = game.currentMinigame;
  const questions = mg.memoScene ? memoQuestions(mg.memoScene, mg.contentLanguage) : [];
  const selected = (mg.memoQuestionIds ?? []).map(i => questions[i]);
  const submitted = mg.memoAnswers?.[myPlayerId] !== undefined;
  const ids = mg.participantIds ?? [];
  const shownAnswers = mg.memoAnswers?.[myPlayerId] ?? answers;
  return <PartyFrame results={<>
    <div className="card"><h2>{say('Tu avais l’œil ?', 'Did you spot it?')}</h2>
      {selected.map((q, i) => <div className="memo-answer" key={q.q}><h3>{q.q}</h3><p>✅ {q.options[q.answer]}</p>
        <p className="muted">{say('Ta réponse : ', 'Your answer: ')}{q.options[mg.memoAnswers?.[myPlayerId]?.[i]] ?? '—'}</p></div>)}
    </div>
    {mg.memoScene && <MemoScene scene={mg.memoScene} label={say('La scène de pique-nique révélée', 'The picnic scene revealed')} />}
    <div className="card">{ids.map(id => <p className="mg-row" key={id}><span>{game.players[id]?.name}</span><strong>{mg.scores?.[id] ?? 0}/3</strong></p>)}</div>
  </>}>
    {mg.phase === 'studying' && <>
      <div className="card"><h2>{say('15 secondes pour tout mémoriser !', '15 seconds to remember it all!')}</h2>
        <p>{say('Regarde les couleurs, les objets et les quantités. L’image disparaîtra avant les questions.', 'Look at the colors, objects and quantities. The picture will disappear before the questions.')}</p></div>
      <MemoScene scene={mg.memoScene} label={say('Un pique-nique absurde : observe tous les détails.', 'An absurd picnic: study every detail.')} />
    </>}
    {mg.phase === 'recalling' && <>
      <h2>{say('De quoi te souviens-tu ?', 'What do you remember?')}</h2>
      {mg.type === 'duel' && <p>{ids.includes(myPlayerId)
        ? say('Le meilleur score positif gagne le dé. Égalité : points partagés. Aucun point pour zéro bonne réponse.', 'The highest positive score wins the die. Ties split the points. Zero correct answers earns nothing.')
        : say('Seuls les duellistes répondent. Les réponses restent cachées jusqu’au résultat.', 'Only the duellists answer. Their answers stay hidden until the results.')}</p>}
      {selected.map((q, i) => <fieldset className="card memo-question" key={q.q} disabled={submitted || !ids.includes(myPlayerId)}>
        <legend>{i + 1}. {q.q}</legend>
        <div className="memo-options">{q.options.map((option, index) => <button type="button" key={option} className={`btn btn-category ${shownAnswers[i] === index ? 'voted' : ''}`} aria-pressed={shownAnswers[i] === index}
          onClick={() => setAnswers(old => old.map((answer, j) => i === j ? index : answer))}>{option}</button>)}</div>
      </fieldset>)}
      <button className="btn btn-success" disabled={submitted || answers.some(a => a === null) || !ids.includes(myPlayerId)} onClick={() => setMyEntry('memoAnswers', answers)}>{submitted ? say('Réponses verrouillées', 'Answers locked') : say('Valider mes souvenirs', 'Lock in my memories')}</button>
      <TallyLine done={ids.filter(id => mg.memoAnswers?.[id] !== undefined).length} total={ids.length} label={say('ont répondu', 'have answered')} />
    </>}
  </PartyFrame>;
}
