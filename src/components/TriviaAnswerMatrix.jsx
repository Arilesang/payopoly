import { useText } from '../context/useText';

export default function TriviaAnswerMatrix({ minigame, players, playerIds }) {
  const tr = useText();
  const questions = minigame.triviaQuestions ?? [];
  const rows = playerIds.map(id => {
    const answers = Object.values(minigame.triviaAnswers?.[id] ?? {});
    const cells = questions.map((q, i) => {
      const answer = answers.find(a => a.questionIndex === i);
      const answered = Number.isInteger(answer?.answerIndex) && answer.answerIndex >= 0;
      return { answered, correct: answered && answer.answerIndex === q.answer, text: answered ? q.options[answer.answerIndex] : tr("Sans réponse") };
    });
    return { id, cells, score: cells.filter(c => c.correct).length };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="card trivia-matrix-wrap">
      <table className="trivia-matrix">
        <caption>{tr("Réponses par joueur")}</caption>
        <thead>
          <tr>
            <th scope="col">{tr("Joueur")}</th>
            {questions.map((q, i) => <th scope="col" key={i} title={q.q}>{i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <th scope="row">{players[row.id]?.name}</th>
              {row.cells.map((cell, i) => (
                <td key={i} className={cell.correct ? 'trivia-cell-correct' : cell.answered ? 'trivia-cell-wrong' : 'trivia-cell-empty'}
                  title={cell.text} aria-label={`${tr(cell.correct ? "Bonne réponse" : cell.answered ? "Mauvaise réponse" : "Sans réponse")} : ${cell.text}`}>
                  {cell.correct ? '✓' : cell.answered ? '✕' : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
