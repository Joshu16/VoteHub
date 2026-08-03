import { useEffect, useState } from 'react'
import './Registros.css'
import { AccordionChevron } from '../components/AdminUI'
import { deleteElectionByYear, getAllElections } from '../lib/electionsStore'
import { formatDateRange, formatElectionPeriod } from '../lib/electionPeriod'
import { getElectionWinner } from '../lib/electionWinner'

/* Detecta si un partido es voto nulo */
function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Etiqueta de encabezado segun tipo de resultado */
function winnerHeading(winner) {
  if (winner.type === 'tie') return 'Empate entre'
  if (winner.type === 'winner') return 'Ganador'
  return 'Resultado'
}

/* Historial de ediciones electorales con detalle expandible */
function Registros() {
  const [elections, setElections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedYear, setExpandedYear] = useState(null)
  const [deletingYear, setDeletingYear] = useState(null)

  /* Carga todas las elecciones del historial */
  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await getAllElections()
      setElections(data)
    } catch {
      window.alert('No se pudieron cargar los registros.')
      setElections([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* Elimina una edicion tras confirmacion */
  const handleDeleteElection = (year) => {
    const shouldDelete = window.confirm(
      `Eliminar la eleccion del periodo ${formatElectionPeriod(year)}?`,
    )
    if (!shouldDelete) return

    setDeletingYear(year)
    deleteElectionByYear(year)
      .then(loadData)
      .catch(() => window.alert('No se pudo eliminar la eleccion.'))
      .finally(() => setDeletingYear(null))
  }

  /* Expande o colapsa detalle de una edicion */
  const toggleEdition = (year) => {
    setExpandedYear((prev) => (prev === year ? null : year))
  }

  return (
    <section className="registros-page">
      <header className="registros-header">
        <h1>Registros</h1>
        <p>Historial de ediciones electorales. Abre una tarjeta para ver partidos, votos y fechas.</p>
      </header>

      <div className="edition-list">
        {isLoading && <p className="edition-loading">Cargando ediciones...</p>}

        {!isLoading &&
          elections.map((item) => {
            const winner = getElectionWinner(item.parties)
            const realParties = item.parties.filter((p) => !esVotoNulo(p.name))
            const totalVotes = realParties.reduce((s, p) => s + Number(p.votes || 0), 0)
            const isOpen = expandedYear === item.year
            const periodLabel = formatElectionPeriod(item.year)

            return (
              <article
                key={item.year}
                className={`edition-card${isOpen ? ' is-open' : ''}`}
              >
                <button
                  type="button"
                  className="edition-card-header"
                  onClick={() => toggleEdition(item.year)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Ocultar' : 'Ver'} detalles de ${periodLabel}`}
                >
                  <div className="edition-card-leading">
                    <div className="edition-card-title-row">
                      <span className="edition-period">{periodLabel}</span>
                      <div className="edition-badges">
                        <span
                          className={`edition-badge${item.isActive ? ' edition-badge--active' : ' edition-badge--closed'}`}
                        >
                          {item.isActive ? 'Activa' : 'Cerrada'}
                        </span>
                        {item.is_visible === false && (
                          <span className="edition-badge edition-badge--hidden">Oculta en landing</span>
                        )}
                      </div>
                    </div>

                    <div className="edition-card-stats">
                      <span>
                        {realParties.length} partido{realParties.length === 1 ? '' : 's'}
                      </span>
                      <span className="edition-stat-sep" aria-hidden>
                        |
                      </span>
                      <span>
                        {totalVotes} voto{totalVotes === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="edition-winner-block">
                      <span className="edition-winner-label">{winnerHeading(winner)}</span>
                      <span className={`edition-winner-name edition-winner-name--${winner.type}`}>
                        {winner.label}
                      </span>
                    </div>
                  </div>

                  <div className="edition-card-toggle">
                    <span className="edition-toggle-hint">{isOpen ? 'Ocultar' : 'Ver detalles'}</span>
                    <AccordionChevron isOpen={isOpen} />
                  </div>
                </button>

                {isOpen && (
                  <div className="edition-card-body">
                    {(item.start_date || item.end_date) && (
                      <section className="edition-section">
                        <h3 className="edition-section-title">Periodo electoral</h3>
                        <p className="edition-dates">{formatDateRange(item.start_date, item.end_date)}</p>
                      </section>
                    )}

                    <section className="edition-section">
                      <h3 className="edition-section-title">Resultados por partido</h3>
                      <p className="edition-summary">
                        Total de {totalVotes} voto{totalVotes === 1 ? '' : 's'} repartidos entre{' '}
                        {realParties.length} partido{realParties.length === 1 ? '' : 's'}.
                      </p>

                      <ul className="edition-parties">
                        {realParties.map((party, index) => {
                          const votes = Number(party.votes || 0)
                          const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0
                          const isWinner = winner.winners?.some((w) => w.id === party.id)

                          return (
                            <li
                              key={party.id}
                              className={`edition-party-row${isWinner ? ' is-winner' : ''}`}
                            >
                              <div className="edition-party-info">
                                {party.image_url && (
                                  <img src={party.image_url} alt="" className="edition-party-logo" />
                                )}
                                <div className="edition-party-text">
                                  <strong>{party.name}</strong>
                                  {isWinner && <span className="edition-party-tag">Líder</span>}
                                  {party.mascot_url && (
                                    <img
                                      src={party.mascot_url}
                                      alt="Mascota"
                                      className="edition-party-mascot"
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="edition-party-votes">
                                <div className="edition-vote-bar-track" aria-hidden>
                                  <div
                                    className="edition-vote-bar"
                                    style={{
                                      width: `${totalVotes ? Math.max(pct, votes > 0 ? 4 : 0) : 0}%`,
                                      background: `hsl(${175 + index * 18}, 70%, 45%)`,
                                    }}
                                  />
                                </div>
                                <span className="edition-vote-count">
                                  {votes} voto{votes === 1 ? '' : 's'}
                                  <em>{pct}%</em>
                                </span>
                              </div>
                            </li>
                          )
                        })}
                        {realParties.length === 0 && (
                          <li className="edition-empty-row">Sin partidos registrados.</li>
                        )}
                      </ul>
                    </section>

                    <section className="edition-section edition-section--danger">
                      <h3 className="edition-section-title">Zona de riesgo</h3>
                      <p className="edition-danger-hint">
                        Eliminar una edicion borra sus partidos y votos. Esta accion no se puede deshacer.
                      </p>
                      <div className="edition-actions">
                        <button
                          type="button"
                          className="edition-delete-btn"
                          onClick={() => handleDeleteElection(item.year)}
                          disabled={deletingYear === item.year}
                        >
                          {deletingYear === item.year ? 'Eliminando...' : 'Eliminar edicion'}
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </article>
            )
          })}

        {!isLoading && elections.length === 0 && (
          <p className="edition-empty">No hay elecciones registradas.</p>
        )}
      </div>
    </section>
  )
}

export default Registros
