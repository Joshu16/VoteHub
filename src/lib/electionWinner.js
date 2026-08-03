/* Detecta si un partido es la opcion de voto nulo */
function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Calcula ganador, empate o ausencia de votos de una eleccion */
export function getElectionWinner(parties) {
  const lista = (parties || []).filter((p) => !esVotoNulo(p.name))
  if (lista.length === 0) {
    return { type: 'none', label: 'Sin datos', maxVotes: 0, winners: [] }
  }

  const maxVotes = Math.max(...lista.map((p) => Number(p.votes || 0)))
  if (maxVotes === 0) {
    return { type: 'none', label: 'Sin votos', maxVotes: 0, winners: [] }
  }

  const winners = lista.filter((p) => Number(p.votes || 0) === maxVotes)
  if (winners.length > 1) {
    return {
      type: 'tie',
      label: winners.map((w) => w.name).join(', '),
      maxVotes,
      winners,
    }
  }

  return { type: 'winner', label: winners[0].name, maxVotes, winners }
}
