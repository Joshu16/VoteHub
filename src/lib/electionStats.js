const GRADO_ORDER = ['decimo', 'undecimo', 'duodecimo']

export const CHART_COLORS = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // rose
  '#ea580c', // orange
  '#ca8a04', // gold
  '#16a34a', // green
  '#0891b2', // cyan
  '#4f46e5', // indigo
  '#b45309', // amber brown
]

/* Detecta si un partido es voto nulo */
export function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Ordena grados segun orden escolar o alfabeticamente */
export function sortGrados(a, b) {
  const la = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const lb = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const ia = GRADO_ORDER.findIndex((g) => la.includes(g))
  const ib = GRADO_ORDER.findIndex((g) => lb.includes(g))
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b, 'es')
}

/* Agrupa votos por grado con padron y abstenciones */
export function buildGradoStats(rows, votersByGrado) {
  const map = {}

  for (const [grado, count] of Object.entries(votersByGrado || {})) {
    const key = grado || 'Sin grado'
    map[key] = { grado: key, parties: [], enrolled: Number(count || 0) }
  }

  for (const row of rows || []) {
    const key = row.grado || 'Sin grado'
    if (!map[key]) {
      map[key] = { grado: key, parties: [], enrolled: 0 }
    }
    map[key].parties.push({
      id: row.party_id,
      name: row.party_name,
      votes: Number(row.votes || 0),
    })
  }

  return Object.values(map)
    .map((item) => {
      const parties = item.parties
        .filter((p) => !esVotoNulo(p.name))
        .sort((a, b) => b.votes - a.votes)
      const totalVotes = parties.reduce((s, p) => s + p.votes, 0)
      return {
        ...item,
        parties,
        totalVotes,
        abstentions: Math.max(item.enrolled - totalVotes, 0),
      }
    })
    .sort((a, b) => sortGrados(a.grado, b.grado))
}

/* Prepara datos para graficos de barras y torta */
export function buildChartData(parties, enrolled) {
  const barras = parties.map((p) => ({ nombre: p.name, votos: p.votes }))
  const totalVotes = barras.reduce((s, b) => s + b.votos, 0)
  const abstentions = Math.max(enrolled - totalVotes, 0)
  const participationPercent = enrolled ? ((totalVotes / enrolled) * 100).toFixed(1) : '0'
  const pieData = [
    ...barras.map((item, i) => ({
      name: item.nombre,
      value: item.votos,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    ...(abstentions > 0 ? [{ name: 'Abstención', value: abstentions, color: '#d1d5db' }] : []),
  ]
  return { barras, totalVotes, abstentions, participationPercent, pieData }
}
