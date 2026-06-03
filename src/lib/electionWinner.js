function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Ganador del periodo (excluye voto nulo) */
export function getElectionWinner(parties) {
  const candidatos = (parties || []).filter((p) => !esVotoNulo(p.name))
  if (candidatos.length === 0) {
    return { type: 'no_parties', label: 'Sin partidos' }
  }

  let maxVotes = 0
  for (const party of candidatos) {
    const votes = Number(party.votes || 0)
    if (votes > maxVotes) {
      maxVotes = votes
    }
  }

  if (maxVotes === 0) {
    return { type: 'no_votes', label: 'Sin votos', maxVotes: 0 }
  }

  const winners = candidatos.filter((p) => Number(p.votes || 0) === maxVotes)
  if (winners.length === 1) {
    return {
      type: 'winner',
      label: winners[0].name,
      winners,
      maxVotes,
    }
  }

  return {
    type: 'tie',
    label: `Empate: ${winners.map((w) => w.name).join(', ')}`,
    winners,
    maxVotes,
  }
}
