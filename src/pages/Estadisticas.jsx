import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './Estadisticas.css'
import { getActiveElection, getAllElections, getVotesByGrado } from '../lib/electionsStore'
import { VOTEHUB_REFRESH_EVENT } from '../lib/dataRefresh'
import { getVotersRegistryStats } from '../lib/voterRegistry'
import { formatDateRange, formatElectionPeriod } from '../lib/electionPeriod'

const CHART_COLORS = ['#00bec9', '#23c8d1', '#4fd4db', '#7ce0e5', '#0d9ea8', '#16a34a', '#d97706']

/* Orden preferido de grados en graficos */
const GRADO_ORDER = ['decimo', 'undecimo', 'duodecimo']

/* Detecta si un partido es voto nulo */
function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Ordena grados segun orden escolar o alfabeticamente */
function sortGrados(a, b) {
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
function buildGradoStats(rows, votersByGrado) {
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
function buildChartData(parties, enrolled) {
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

/* Grafico de barras de votos por partido */
function VotesBarChart({ data }) {
  return (
    <div className="recharts-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 12, fill: '#475569' }}
            angle={-20}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--accent)',
              fontSize: 13,
            }}
          />
          <Bar dataKey="votos" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* Grafico circular de distribucion de votos */
function VotesPieChart({ data }) {
  return (
    <div className="recharts-wrap recharts-wrap--pie">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/* Pagina de estadisticas con KPIs y graficos por grado */
function Estadisticas() {
  const [activeElection, setActiveElection] = useState(null)
  const [allElections, setAllElections] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [voterStats, setVoterStats] = useState({ total: 0, byGrado: {} })
  const [votesByGradoRows, setVotesByGradoRows] = useState([])
  const [selectedGrado, setSelectedGrado] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  /* Carga datos y escucha refrescos automaticos cada 5s */
  useEffect(() => {
    let isMounted = true

    const loadStats = async ({ quiet = false } = {}) => {
      if (!quiet) setIsLoading(true)
      try {
        const [election, registry, history] = await Promise.all([
          getActiveElection({ force: quiet }),
          getVotersRegistryStats(),
          getAllElections(),
        ])
        const year = selectedYear ?? election?.year ?? history[0]?.year ?? null
        const gradoRows = year != null ? await getVotesByGrado(year) : []

        if (!isMounted) return
        setActiveElection(election)
        setAllElections(history)
        setVoterStats(registry)
        setVotesByGradoRows(gradoRows)
        if (!selectedYear && year != null) {
          setSelectedYear(year)
        }
      } catch {
        if (!isMounted) return
        setActiveElection(null)
        setAllElections([])
        setVoterStats({ total: 0, byGrado: {} })
        setVotesByGradoRows([])
      } finally {
        if (isMounted && !quiet) setIsLoading(false)
      }
    }

    const onRefresh = () => loadStats({ quiet: true })

    loadStats()
    const intervalId = setInterval(() => loadStats({ quiet: true }), 5000)
    window.addEventListener(VOTEHUB_REFRESH_EVENT, onRefresh)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      window.removeEventListener(VOTEHUB_REFRESH_EVENT, onRefresh)
    }
  }, [selectedYear])

  const displayElection =
    allElections.find((e) => e.year === selectedYear) || activeElection

  const barras = (displayElection?.parties || [])
    .filter((p) => !esVotoNulo(p.name))
    .map((party) => ({
      id: party.id,
      nombre: party.name,
      votos: Number(party.votes || 0),
    }))

  const totalVoters = voterStats.total
  const general = buildChartData(
    barras.map((b) => ({ name: b.nombre, votes: b.votos })),
    totalVoters,
  )

  const gradoStats = useMemo(
    () => buildGradoStats(votesByGradoRows, voterStats.byGrado),
    [votesByGradoRows, voterStats.byGrado],
  )

  /* Selecciona grado activo al cambiar la lista */
  useEffect(() => {
    if (gradoStats.length === 0) {
      setSelectedGrado('')
      return
    }
    if (!selectedGrado || !gradoStats.some((g) => g.grado === selectedGrado)) {
      setSelectedGrado(gradoStats[0].grado)
    }
  }, [gradoStats, selectedGrado])

  const activeGrado = gradoStats.find((g) => g.grado === selectedGrado) ?? null
  const gradoCharts = activeGrado
    ? buildChartData(activeGrado.parties, activeGrado.enrolled)
    : null

  return (
    <section className="stats-page">
      <header className="stats-header">
        <h1>Estadísticas administrativas</h1>
        {!isLoading && (
          <p>
            {displayElection
              ? `Período ${formatElectionPeriod(displayElection.year)}${
                  displayElection.isActive ? ' (activa)' : ''
                }.`
              : 'No hay elecciones registradas.'}
          </p>
        )}
      </header>

      {!isLoading && allElections.length > 1 && (
        <div className="stats-edition-picker">
          <label>
            Edición
            <select
              value={selectedYear ?? ''}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {allElections.map((e) => (
                <option key={e.year} value={e.year}>
                  {formatElectionPeriod(e.year)}
                  {e.isActive ? ' · Activa' : ''}
                </option>
              ))}
            </select>
          </label>
          {displayElection?.start_date || displayElection?.end_date ? (
            <span className="stats-date-range">
              {formatDateRange(displayElection.start_date, displayElection.end_date)}
            </span>
          ) : null}
        </div>
      )}

      <div className="stats-layout">
        <div className="stats-main">
          <div className="kpi-grid">
            <article className="kpi-card">
              <span>Votos Totales</span>
              <strong>{general.totalVotes}</strong>
            </article>
            <article className="kpi-card">
              <span>Partidos</span>
              <strong>{barras.length}</strong>
            </article>
            <article className="kpi-card">
              <span>Estudiantes</span>
              <strong>{totalVoters}</strong>
            </article>
            <article className="kpi-card">
              <span>Participación</span>
              <strong>{general.participationPercent}%</strong>
            </article>
          </div>

          <section className="chart-card">
            <h2>Votos por partido</h2>
            {isLoading && <p>Cargando...</p>}
            {!isLoading && barras.length === 0 && <p>Sin datos para mostrar.</p>}
            {!isLoading && barras.length > 0 && <VotesBarChart data={barras} />}
          </section>
        </div>

        <aside className="abstention-card">
          <h2>Distribución</h2>
          <p className="abstention-voted">
            <span className="dot dot-accent"></span>
            Votaron: {general.totalVotes} de {totalVoters}
          </p>
          {!isLoading && general.pieData.length > 0 && <VotesPieChart data={general.pieData} />}
          <ul className="abstention-list">
            <li>Abstenciones: {general.abstentions}</li>
            {barras.map((item, index) => (
              <li key={item.nombre}>
                <span className={`dot tone-${(index % 4) + 1}`}></span>
                {item.nombre}: {item.votos} votos
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {!isLoading && gradoStats.length > 0 && activeGrado && gradoCharts && (
        <section className="stats-grado-section">
          <div className="stats-grado-section-head">
            <div>
              <h2>Por generación</h2>
              <p>Selecciona un grado para ver su desglose de votos.</p>
            </div>
            <label className="stats-grado-select">
              Generación
              <select value={selectedGrado} onChange={(e) => setSelectedGrado(e.target.value)}>
                {gradoStats.map((item) => (
                  <option key={item.grado} value={item.grado}>
                    {item.grado}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="kpi-grid stats-grado-kpis">
            <article className="kpi-card">
              <span>Votos en {activeGrado.grado}</span>
              <strong>{gradoCharts.totalVotes}</strong>
            </article>
            <article className="kpi-card">
              <span>Estudiantes</span>
              <strong>{activeGrado.enrolled}</strong>
            </article>
            <article className="kpi-card">
              <span>Participación</span>
              <strong>{gradoCharts.participationPercent}%</strong>
            </article>
            <article className="kpi-card">
              <span>Abstenciones</span>
              <strong>{gradoCharts.abstentions}</strong>
            </article>
          </div>

          <div className="stats-layout">
            <div className="stats-main">
              <section className="chart-card">
                <h2>{activeGrado.grado} · Votos por partido</h2>
                {gradoCharts.barras.length === 0 ? (
                  <p>Sin votos registrados para este grado.</p>
                ) : (
                  <VotesBarChart data={gradoCharts.barras} />
                )}
              </section>

              <section className="chart-card stats-grado-table-card">
                <h2>Detalle · {activeGrado.grado}</h2>
                <div className="stats-grado-table-wrap">
                  <table className="stats-grado-table">
                    <thead>
                      <tr>
                        <th>Partido</th>
                        <th>Votos</th>
                        <th>Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGrado.parties.map((party, index) => {
                        const pct = gradoCharts.totalVotes
                          ? ((party.votes / gradoCharts.totalVotes) * 100).toFixed(1)
                          : '0.0'
                        return (
                          <tr key={party.id || party.name}>
                            <td>
                              <span className="stats-grado-party-cell">
                                <span
                                  className="dot"
                                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                                />
                                {party.name}
                              </span>
                            </td>
                            <td>{party.votes}</td>
                            <td>{pct}%</td>
                          </tr>
                        )
                      })}
                      {gradoCharts.abstentions > 0 && (
                        <tr className="stats-grado-table-abstention">
                          <td>
                            <span className="stats-grado-party-cell">
                              <span className="dot dot-muted" />
                              Abstención
                            </span>
                          </td>
                          <td>{gradoCharts.abstentions}</td>
                          <td>
                            {activeGrado.enrolled
                              ? (
                                  (gradoCharts.abstentions / activeGrado.enrolled) *
                                  100
                                ).toFixed(1)
                              : '0.0'}
                            %
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        <td>{gradoCharts.totalVotes}</td>
                        <td>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>

            <aside className="abstention-card">
              <h2>{activeGrado.grado}</h2>
              <p className="abstention-voted">
                <span className="dot dot-accent"></span>
                Votaron: {gradoCharts.totalVotes} de {activeGrado.enrolled}
              </p>
              {gradoCharts.pieData.length > 0 && <VotesPieChart data={gradoCharts.pieData} />}
              <ul className="abstention-list abstention-list--compact">
                {activeGrado.parties.map((party, index) => (
                  <li key={party.id || party.name}>
                    <span className={`dot tone-${(index % 4) + 1}`}></span>
                    {party.name}: {party.votes} votos
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      )}
    </section>
  )
}

export default Estadisticas
