export function scoringRule(key, lang) {
  const en = lang === 'en';
  const cap = en ? 'Each player can earn at most the die value per minigame. ' : 'Chaque joueur gagne au maximum la valeur du dé par mini-jeu. ';
  const rules = {
    'all:Bluff': ['La vérité et chaque joueur dupé rapportent une part ; une part vaut le dé divisé par le nombre de joueurs.', 'Finding the truth and fooling each player earn one share; each share is the die value divided by the player count.'],
    'all:Sondage Éclair': ['La majorité rapporte la moitié du dé ; la bonne prédiction rapporte l’autre moitié. Toutes les réponses à égalité en tête comptent.', 'Matching the majority earns half the die value; a correct prediction earns the other half. All tied leading answers count.'],
    'all:Qui a écrit ça': ['Chaque auteur trouvé et l’anonymat rapportent une part ; le dé est divisé par le nombre de réponses exposées (plus une part pour l’anonymat).', 'Each correct author and staying anonymous earn a share; the die value is divided by the number of displayed answers (including a share for anonymity).'],
    'all:Croquis Croisés': ['Chaque bonne réponse ou joueur dupé rapporte une part. Les parts sont réparties selon le nombre de dessins et de joueurs pour équilibrer les groupes.', 'Each correct guess or fooled player earns a share. Shares are scaled by the drawing and player counts to balance different group sizes.'],
    'duel:Punchline': ['Gagner rapporte la moitié du dé ; un vote unanime avec au moins deux votants rapporte la valeur entière. Égalité : partage de la récompense.', 'Winning earns half the die value; a unanimous vote with at least two voters earns the full value. A tie splits the reward.'],
    'duel:Petit Bac': ['Le vainqueur gagne les points du dé. Égalité : partage des points. Aucun vote : aucun point.', 'The winner earns the die value. Ties split the points. No votes means no points.'],
    'all:Trivia': ['Le meilleur score positif gagne. À égalité, le temps cumulé des bonnes réponses départage ; égalité exacte : partage des points. Aucun point pour zéro bonne réponse.', 'The highest positive score wins. Ties use total response time for correct answers; exact ties split points. Zero correct answers earns nothing.'],
    'duel:Trivia': ['Le meilleur score positif gagne. À égalité, le temps cumulé des bonnes réponses départage ; égalité exacte : partage des points. Aucun point pour zéro bonne réponse.', 'The highest positive score wins. Ties use total response time for correct answers; exact ties split points. Zero correct answers earns nothing.'],
  };
  const custom = rules[key];
  return cap + (custom ? custom[en ? 1 : 0] : en ? 'Successful players earn the die value. Votes are hidden until the reveal; a tied yes/no vote is unsuccessful.' : 'Les joueurs qui réussissent gagnent la valeur du dé. Les votes restent cachés jusqu’au résultat ; une égalité oui/non ne valide pas la réussite.');
}
