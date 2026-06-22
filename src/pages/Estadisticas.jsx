import { useEffect, useState } from 'react'
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
import { getActiveElection, getAllElections } from '../lib/electionsStore'
import { VOTEHUB_REFRESH_EVENT } from '../lib/dataRefresh'
import { getVotersCountFromExcel } from '../lib/voterExcel'
import { formatDateRange, formatElectionPeriod } from '../lib/electionPeriod'

const CHART_COLORS = ['#00bec9', '#23c8d1', '#4fd4db', '#7ce0e5', '#0d9ea8', '#16a34a', '#d97706']

function Estadisticas() {
  const [activeElection, setActiveElection] = useState(null)
  const [allElections, setAllElections] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [totalVoters, setTotalVoters] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadStats = async ({ quiet = false } = {}) => {
      if (!quiet) setIsLoading(true)
      try {
        const [election, votersCount, history] = await Promise.all([
          getActiveElection(),
          getVotersCountFromExcel(),
          getAllElections(),
        ])
        if (!isMounted) return
        setActiveElection(election)
        setAllElections(history)
        setTotalVoters(votersCount)
        if (!selectedYear) {
          setSelectedYear(election?.year ?? history[0]?.year ?? null)
        }
      } catch {
        if (!isMounted) return
        setActiveElection(null)
        setAllElections([])
        setTotalVoters(0)
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
    .filter((p) => String(p.name || '').trim().toLowerCase() !== 'voto nulo')
    .map((party) => ({
      nombre: party.name,
      votos: Number(party.votes || 0),
    }))

  const totalVotes = barras.reduce((total, item) => total + item.votos, 0)
  const abstentions = Math.max(totalVoters - totalVotes, 0)
  const participationPercent = totalVoters ? ((totalVotes / totalVoters) * 100).toFixed(1) : '0'

  const pieData = [
    ...barras.map((item, i) => ({
      name: item.nombre,
      value: item.votos,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    ...(abstentions > 0
      ? [{ name: 'Abstención', value: abstentions, color: '#d1d5db' }]
      : []),
  ]

  return (
    <section className="stats-page">
      <header className="stats-header">
        <h1>Estadísticas Administrativas</h1>
        {!isLoading && (
          <p>
            {displayElection
              ? `Periodo ${formatElectionPeriod(displayElection.year)}${
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
              <strong>{totalVotes}</strong>
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
              <strong>{participationPercent}%</strong>
            </article>
          </div>

          <section className="chart-card">
            <h2>Votos por partido</h2>
            {isLoading && <p>Cargando...</p>}
            {!isLoading && barras.length === 0 && <p>Sin datos para mostrar.</p>}
            {!isLoading && barras.length > 0 && (
              <div className="recharts-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barras} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
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
                      {barras.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        <aside className="abstention-card">
          <h2>Distribución</h2>
          <p className="abstention-voted">
            <span className="dot dot-accent"></span>
            Votaron: {totalVotes} de {totalVoters}
          </p>
          {!isLoading && pieData.length > 0 && (
            <div className="recharts-wrap recharts-wrap--pie">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="abstention-list">
            <li>Abstenciones: {abstentions}</li>
            {barras.map((item, index) => (
              <li key={item.nombre}>
                <span className={`dot tone-${(index % 4) + 1}`}></span>
                {item.nombre}: {item.votos} votos
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default Estadisticas
