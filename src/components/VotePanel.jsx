import { useText } from '../context/useText';
// VotePanel — used in all 4 voting screens
// mode: 'yesno' | 'pickwinner'
// eligibleVoterIds: array of playerIds who can vote (spectators)
// players: full players object from game
// votes: current votes from Firebase
// onVote(choice): called when this player votes

export default function VotePanel({ mode, eligibleVoterIds, players, votes, onVote, myPlayerId, label }) {
  const tr = useText();
  const myVote    = votes?.[myPlayerId];
  const canVote   = eligibleVoterIds?.includes(myPlayerId);
  const voteCount = Object.keys(votes ?? {}).length;
  const total     = eligibleVoterIds?.length ?? 0;

  return (
    <div className="vote-panel card">
      <p className="vote-prompt">{label}</p>
      <p className="vote-count muted">{voteCount}/{total} votes</p>

      {mode === 'yesno' && (
        <div className="vote-yesno">
          <button
            className={`btn btn-vote-yes ${myVote === 'yes' ? 'voted' : ''}`}
            onClick={() => !myVote && canVote && onVote('yes')}
            disabled={!!myVote || !canVote}
          > {tr("✅ Oui")}
          </button>
          <button
            className={`btn btn-vote-no ${myVote === 'no' ? 'voted' : ''}`}
            onClick={() => !myVote && canVote && onVote('no')}
            disabled={!!myVote || !canVote}
          > {tr("❌ Non")}
          </button>
        </div>
      )}

      {mode === 'pickwinner' && (
        <div className="vote-pick">
          {eligibleVoterIds?.filter(id => players[id]).map(id => (
            <button
              key={id}
              className={`btn btn-category ${myVote === id ? 'voted' : ''}`}
              onClick={() => !myVote && canVote && onVote(id)}
              disabled={!!myVote || !canVote}
            >
              {players[id]?.name}
            </button>
          ))}
        </div>
      )}

      {!canVote && !myVote && (
        <p className="muted" style={{ textAlign: 'center' }}>{tr("Tu ne peux pas voter dans ce jeu.")}</p>
      )}
      {myVote && <p className="vote-cast">{tr("✓ Vote enregistré")}</p>}
    </div>
  );
}
