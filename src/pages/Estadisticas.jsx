import { useEffect, useState } from 'react'
import './Estadisticas.css'
import { getActiveElection } from '../lib/electionsStore'
import { getVotersCountFromExcel } from '../lib/voterExcel'

/* Estado y datos base */
/* Estadísticas del proceso actual */
function Estadisticas() {
  const [activeElection, setActiveElection] = useState(null)
  const [totalVoters, setTotalVoters] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  /* Refresco automático de datos */
  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      try {
        const [election, votersCount] = await Promise.all([
          getActiveElection(),
          getVotersCountFromExcel(),
        ])
        if (!isMounted) {
          return
        }
        setActiveElection(election)
        setTotalVoters(votersCount)
      } catch {
        if (!isMounted) {
          return
        }
        setActiveElection(null)
        setTotalVoters(0)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadStats()
    const intervalId = setInterval(loadStats, 5000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  /* Cálculos de participación */
  const barras = (activeElection?.parties || []).map((party) => ({
    nombre: party.name,
    votos: Number(party.votes || 0),
  }))
  const totalVotes = barras.reduce((total, item) => total + item.votos, 0)
  const abstentions = Math.max(totalVoters - totalVotes, 0)
  const rawAbstentionPercent = totalVoters ? (abstentions / totalVoters) * 100 : 0
  const abstentionPercent =
    abstentions > 0 && totalVotes > 0
      ? Math.min(rawAbstentionPercent, 99.9)
      : rawAbstentionPercent
  const abstentionPercentLabel = `${abstentionPercent.toFixed(1)}%`

  /* Vista de indicadores y gráficos */
  return (
    <section className="stats-page">
      <header className="stats-header">
        <h1>Estadísticas Administrativas</h1>
        {!isLoading && <p>
          {activeElection
            ? `Elección activa del año ${activeElection.year}.`
            : 'No hay elección activa.'}
        </p>}
      </header>

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
              <span>Abstención</span>
              <strong>{abstentions}</strong>
            </article>
          </div>

          <section className="chart-card">
            <h2>Votos por partido</h2>
            <div className="bar-chart">
              {isLoading && <p>Cargando...</p>}
              {!isLoading &&
                barras.map((item, index) => (
                <div key={item.nombre} className="bar-item">
                  <div className={`bar tone-${index + 1}`} style={{ height: `${Math.max(item.votos, 4)}px` }} />
                  <span>{item.nombre}</span>
                </div>
                ))}
              {!isLoading && barras.length === 0 && <p>Sin datos para mostrar.</p>}
            </div>
          </section>
        </div>

        <aside className="abstention-card">
          <h2>Niveles de abstención</h2>
          <p className="abstention-voted">
            <span className="dot dot-accent"></span>
            Votaron: {totalVotes}
          </p>
          <div className="donut-wrap">
            <div
              className="donut-chart"
              style={{
                background: `conic-gradient(var(--accent) 0 ${abstentionPercent}%, #d1d5db ${abstentionPercent}% 100%)`,
              }}
            >
              <div className="donut-inner">{abstentionPercentLabel}</div>
            </div>
          </div>
          <ul className="abstention-list">
            <li>Abstenciones: {abstentions}</li>
            {barras.map((item, index) => (
              <li key={item.nombre}>
                <span className={`dot tone-${index + 1}`}></span>
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
