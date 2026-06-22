import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './Dashboard.css'
import {
  addParty,
  clearElectionData,
  editParty,
  ensureElection,
  getActiveElection,
  removeParty,
  startElection,
  stopElection,
  updateElectionSettings,
} from '../lib/electionsStore'
import { formatDateRange, formatElectionPeriod } from '../lib/electionPeriod'
import { notifyDataRefresh } from '../lib/dataRefresh'
import { parsePartyOfficers, serializePartyOfficers } from '../lib/partyOfficers'
import { getElectionWinner } from '../lib/electionWinner'
import { PartyFormPanel, emptyPartyFormState } from '../components/PartyFormPanel'
import { AccordionChevron, AdminField, AdminInput, AdminSwitch } from '../components/AdminUI'
import '../styles/admin-forms.css'

function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

function Dashboard() {
  const currentYear = new Date().getFullYear()
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modalMode, setModalMode] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [formState, setFormState] = useState(emptyPartyFormState)
  const [selectedParty, setSelectedParty] = useState(null)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isSavingParty, setIsSavingParty] = useState(false)
  const [isDeletingParty, setIsDeletingParty] = useState(false)
  const [isCleaningData, setIsCleaningData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [quickPartyName, setQuickPartyName] = useState('')
  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [quickFormError, setQuickFormError] = useState('')
  const [stopFlowElection, setStopFlowElection] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const electionYear = Number(election?.year ?? currentYear)

  const loadData = async ({ quiet = false } = {}) => {
    if (!quiet) setIsLoading(true)
    try {
      const activeElection = await getActiveElection()
      if (activeElection) {
        setElection(activeElection)
        setStartDate(activeElection.start_date || '')
        setEndDate(activeElection.end_date || '')
        setIsVisible(activeElection.is_visible !== false)
      } else {
        const existingElection = await ensureElection(currentYear)
        setElection(existingElection)
        setStartDate(existingElection.start_date || '')
        setEndDate(existingElection.end_date || '')
        setIsVisible(existingElection.is_visible !== false)
      }
    } catch (error) {
      setFeedback(`No se pudo cargar la elección: ${error?.message || 'Error desconocido'}`)
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentYear])

  useEffect(() => {
    if (!modalMode) {
      document.body.classList.remove('modal-open')
      return
    }
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [modalMode])

  const handleRefreshData = async () => {
    setIsRefreshing(true)
    try {
      await loadData({ quiet: true })
      notifyDataRefresh()
      setFeedback('Datos actualizados (panel y estadísticas).')
    } catch (error) {
      setFeedback(`No se pudieron actualizar los datos: ${error?.message || 'Error desconocido'}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleStartElection = () => {
    setIsStarting(true)
    startElection(currentYear)
      .then(() => {
        setFeedback(`Elección iniciada: ${formatElectionPeriod(currentYear)}.`)
        closeModal()
        return loadData()
      })
      .catch((error) =>
        setFeedback(`No se pudo iniciar la elección: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsStarting(false))
  }

  const handleStopElection = () => {
    const targetElection = election
    if (!targetElection) return
    setIsStopping(true)
    stopElection(targetElection.year)
      .then(() => ensureElection(targetElection.year))
      .then((freshElection) => {
        setElection(freshElection)
        setStopFlowElection(freshElection)
        setFeedback(`Elección finalizada: ${formatElectionPeriod(targetElection.year)}.`)
        setModalMode('stop-winner')
      })
      .catch((error) =>
        setFeedback(`No se pudo detener la elección: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsStopping(false))
  }

  const isElectionActive = Boolean(election?.isActive)
  const isTogglingElection = isStarting || isStopping
  const stopFlowWinner = getElectionWinner(stopFlowElection?.parties ?? election?.parties ?? [])

  const handleToggleElection = () => {
    if (isElectionActive) {
      setModalMode('stop-election')
      return
    }
    setModalMode('start-election')
  }

  const closeModal = () => {
    setModalMode('')
    setStopFlowElection(null)
  }

  const closeForm = () => {
    setExpandedId(null)
    setFormState(emptyPartyFormState())
    setSelectedParty(null)
    setFormError('')
  }

  const handleQuickAddParty = () => {
    const nombre = quickPartyName.trim()
    if (!nombre) {
      setQuickFormError('Escribe el nombre del partido.')
      return
    }
    setQuickFormError('')
    setIsQuickAdding(true)
    addParty(electionYear, nombre, null, null, null)
      .then((result) => {
        if (!result?.ok) {
          setQuickFormError('Nombre vacío o duplicado.')
          return
        }
        setQuickPartyName('')
        setFeedback('Partido creado. Expándelo para añadir logo y datos.')
        return loadData()
      })
      .catch((error) =>
        setQuickFormError(`No se pudo crear: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsQuickAdding(false))
  }

  const toggleParty = (party) => {
    if (expandedId === party.id) {
      closeForm()
      return
    }
    setExpandedId(party.id)
    setSelectedParty(party)
    setFormState({
      partyName: party.name,
      partyImage: party.image_url || '',
      partyMascot: party.mascot_url || '',
      partyOfficers: parsePartyOfficers(party.officers_json),
    })
    setFormError('')
  }

  const handleSaveParty = () => {
    const nombre = formState.partyName.trim()
    if (!nombre) {
      setFormError('El nombre del partido es obligatorio.')
      return
    }
    setFormError('')
    setIsSavingParty(true)
    const officersJson = serializePartyOfficers(formState.partyOfficers)
    editParty(
      electionYear,
      selectedParty.id,
      nombre,
      formState.partyImage || null,
      formState.partyMascot || null,
      officersJson,
    )
      .then((result) => {
        if (!result?.ok) {
          setFormError('Nombre vacío o duplicado.')
          return
        }
        const baseMsg = 'Partido editado.'
        setFeedback(baseMsg)
        closeForm()
        return loadData()
      })
      .catch((error) =>
        setFormError(`No se pudo guardar el partido: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSavingParty(false))
  }

  const handleDeleteParty = () => {
    if (!selectedParty) return
    const shouldDelete = window.confirm(`¿Eliminar ${selectedParty.name}?`)
    if (!shouldDelete) return
    setIsDeletingParty(true)
    removeParty(electionYear, selectedParty.id)
      .then(() => {
        setFeedback('Partido eliminado.')
        closeForm()
        return loadData()
      })
      .catch((error) => setFormError(`No se pudo eliminar: ${error?.message || 'Error desconocido'}`))
      .finally(() => setIsDeletingParty(false))
  }

  const handleSaveSettings = () => {
    setIsSavingSettings(true)
    updateElectionSettings(electionYear, {
      startDate: startDate || null,
      endDate: endDate || null,
      isVisible,
    })
      .then(() => {
        setFeedback('Configuración del periodo guardada.')
        return loadData({ quiet: true })
      })
      .catch((error) =>
        setFeedback(`No se pudo guardar: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSavingSettings(false))
  }

  const handleExportData = (targetElection = election) => {
    const parties = targetElection?.parties || []
    if (!targetElection || targetElection.isActive || !parties.length) return
    const rows = [['Periodo', 'Partido', 'Votos']]
    for (const party of parties) {
      rows.push([formatElectionPeriod(targetElection.year), party.name, String(party.votes || 0)])
    }
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `eleccion_${formatElectionPeriod(targetElection.year)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setFeedback('Datos exportados.')
  }

  const handleCleanData = (year) => {
    setIsCleaningData(true)
    clearElectionData(year)
      .then(() => {
        setFeedback(`Datos limpiados para ${formatElectionPeriod(year)}.`)
        closeModal()
        return loadData()
      })
      .catch((error) =>
        setFeedback(`No se pudieron limpiar los datos: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsCleaningData(false))
  }

  const editableParties = (election?.parties ?? []).filter((p) => !esVotoNulo(p.name))

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>Centro de Control</h1>
        <p>Elecciones del periodo {formatElectionPeriod(electionYear)}</p>
      </header>

      <section className="election-settings-card">
        <div className="election-settings-head">
          <div>
            <h2>Periodo electoral</h2>
            <p className="election-settings-sub">
              {startDate || endDate
                ? formatDateRange(startDate, endDate)
                : `Año lectivo ${formatElectionPeriod(electionYear)}`}
            </p>
          </div>
          <div className="election-settings-head-actions">
            <button
              type="button"
              className={`refresh-data-btn${isRefreshing ? ' refresh-data-btn--spinning' : ''}`}
              onClick={handleRefreshData}
              disabled={isRefreshing || isLoading}
              aria-label="Actualizar datos"
              title="Actualizar datos"
            >
              <svg className="refresh-data-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08a5.99 5.99 0 0 1-5.65 4c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn election-settings-save"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
        <div className="election-settings-body">
          <div className="election-settings-dates">
            <AdminField label="Inicio">
              <AdminInput
                type="date"
                className="admin-input--date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </AdminField>
            <AdminField label="Fin">
              <AdminInput
                type="date"
                className="admin-input--date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </AdminField>
          </div>
          <AdminSwitch
            label="Visible al público"
            description="Mostrar candidatos y fechas en la página principal"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
        </div>
        <div className="election-settings-footer">
          <p className={`election-state-pill ${isElectionActive ? 'active' : 'inactive'}`}>
            {isElectionActive ? 'Elección activa' : 'Elección detenida'}
            {!isVisible && ' · Oculta'}
          </p>
          <button
            type="button"
            onClick={handleToggleElection}
            disabled={isTogglingElection}
            className={`election-toggle-btn${isElectionActive ? ' election-toggle-btn--stop' : ''}`}
          >
            {isStarting
              ? 'Iniciando...'
              : isStopping
                ? 'Terminando...'
                : isElectionActive
                  ? 'Terminar elecciones'
                  : 'Iniciar elecciones'}
          </button>
        </div>
      </section>

      {feedback && <p className="dashboard-feedback">{feedback}</p>}

      <div className="party-accordion-list">
        {isLoading && <p className="party-accordion-loading">Cargando partidos...</p>}

        {!isLoading &&
          editableParties.map((partido) => (
            <article
              key={partido.id}
              className={`party-accordion-item${expandedId === partido.id ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="party-accordion-header"
                onClick={() => toggleParty(partido)}
                aria-expanded={expandedId === partido.id}
              >
                <div className="party-accordion-header-left">
                  {partido.image_url && (
                    <img src={partido.image_url} alt="" className="party-accordion-thumb" />
                  )}
                  <span className="party-accordion-title">{partido.name}</span>
                </div>
                <div className="party-accordion-header-right">
                  <span className="party-accordion-votes">{partido.votes} votos</span>
                  <AccordionChevron isOpen={expandedId === partido.id} />
                </div>
              </button>
              {expandedId === partido.id && (
                <PartyFormPanel
                  partyName={formState.partyName}
                  setPartyName={(v) => setFormState((s) => ({ ...s, partyName: v }))}
                  partyImage={formState.partyImage}
                  setPartyImage={(v) => setFormState((s) => ({ ...s, partyImage: v }))}
                  partyMascot={formState.partyMascot}
                  setPartyMascot={(v) => setFormState((s) => ({ ...s, partyMascot: v }))}
                  partyOfficers={formState.partyOfficers}
                  setPartyOfficers={(fn) =>
                    setFormState((s) => ({
                      ...s,
                      partyOfficers: typeof fn === 'function' ? fn(s.partyOfficers) : fn,
                    }))
                  }
                  formError={formError}
                  isSaving={isSavingParty || isDeletingParty}
                  onSave={handleSaveParty}
                  onCancel={closeForm}
                  onDelete={handleDeleteParty}
                  showDelete
                />
              )}
            </article>
          ))}

        {!isLoading && editableParties.length === 0 && (
          <p className="party-accordion-empty">No hay partidos para este año.</p>
        )}

        {!isLoading && (
          <article className="party-add-card">
            <div className="party-add-card__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="party-add-card__content">
              <p className="party-add-card__title">Añadir partido</p>
              <p className="party-add-card__hint">Solo el nombre; después podrás completar logo y datos.</p>
              <div className="party-add-card__row">
                <AdminInput
                  type="text"
                  value={quickPartyName}
                  onChange={(e) => setQuickPartyName(e.target.value)}
                  placeholder="Nombre del partido"
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAddParty()}
                />
                <button
                  type="button"
                  className="party-add-card__btn"
                  onClick={handleQuickAddParty}
                  disabled={isQuickAdding || isTogglingElection}
                >
                  {isQuickAdding ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
              {quickFormError && <p className="modal-error">{quickFormError}</p>}
            </div>
          </article>
        )}
      </div>

      <div className="bottom-actions">
        <button
          type="button"
          onClick={handleExportData}
          disabled={Boolean(election?.isActive) || (election?.parties || []).length === 0}
        >
          Exportar Datos
        </button>
        <button
          type="button"
          className="clean-data-btn"
          onClick={() => setModalMode('manual-clean-confirm')}
          disabled={
            Boolean(election?.isActive) || (election?.parties || []).length === 0 || isCleaningData
          }
        >
          Limpiar Datos
        </button>
      </div>

      {modalMode &&
        createPortal(
          <div className="modal-backdrop">
            <div className="party-modal">
              {modalMode === 'start-election' && <h3>Iniciar elecciones</h3>}
              {modalMode === 'stop-election' && <h3>Finalizar elecciones</h3>}
              {modalMode === 'stop-winner' && <h3>Resultado de las elecciones</h3>}
              {modalMode === 'stop-export' && <h3>Exportar datos</h3>}
              {modalMode === 'stop-clean' && <h3>Limpiar datos</h3>}
              {modalMode === 'stop-clean-confirm' && <h3>Confirmar limpieza</h3>}
              {modalMode === 'manual-clean-confirm' && <h3>Confirmar limpieza</h3>}

              {modalMode === 'start-election' && (
                <>
                  <p>
                    Solo se pueden iniciar elecciones del año actual ({currentYear}). El periodo será{' '}
                    {formatElectionPeriod(currentYear)}.
                  </p>
                  <p className="season-pill">{formatElectionPeriod(currentYear)}</p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={handleStartElection}
                      disabled={isStarting}
                    >
                      {isStarting ? 'Iniciando...' : 'Iniciar'}
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'stop-election' && (
                <>
                  <p>¿Finalizar elecciones del periodo {formatElectionPeriod(electionYear)}?</p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={handleStopElection}
                      disabled={isStopping}
                    >
                      {isStopping ? 'Finalizando...' : 'Finalizar'}
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'stop-winner' && (
                <>
                  <p className="winner-modal-period">
                    Periodo {formatElectionPeriod(stopFlowElection?.year ?? electionYear)}
                  </p>
                  <div className={`winner-modal-result winner-modal-result--${stopFlowWinner.type}`}>
                    {stopFlowWinner.type === 'winner' || stopFlowWinner.type === 'tie' ? (
                      <>
                        <p className="winner-modal-result__title">
                          {stopFlowWinner.type === 'tie' ? 'Empate' : 'Ganador'}
                        </p>
                        <p className="winner-modal-result__name">
                          {stopFlowWinner.type === 'tie'
                            ? stopFlowWinner.winners.map((w) => w.name).join(', ')
                            : stopFlowWinner.label}
                        </p>
                        <p className="winner-modal-result__votes">
                          {stopFlowWinner.maxVotes} voto{stopFlowWinner.maxVotes === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <p className="winner-modal-result__name">{stopFlowWinner.label}</p>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={() => setModalMode('stop-export')}>
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'stop-export' && (
                <>
                  <p>¿Desea exportar los datos?</p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={() => setModalMode('stop-clean')}>
                      No
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        handleExportData(stopFlowElection)
                        setModalMode('stop-clean')
                      }}
                    >
                      Sí
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'stop-clean' && (
                <>
                  <p>¿Desea limpiar los datos?</p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={closeModal}>
                      No
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setModalMode('stop-clean-confirm')}
                    >
                      Sí
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'stop-clean-confirm' && (
                <>
                  <p>
                    ¿Seguro que desea limpiar los datos de{' '}
                    {formatElectionPeriod(stopFlowElection?.year)}?
                  </p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => handleCleanData(stopFlowElection?.year)}
                      disabled={isCleaningData}
                    >
                      {isCleaningData ? 'Limpiando...' : 'Limpiar'}
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'manual-clean-confirm' && (
                <>
                  <p>¿Seguro que desea limpiar los datos de {formatElectionPeriod(electionYear)}?</p>
                  <div className="modal-actions">
                    <button type="button" className="icon-btn" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => handleCleanData(electionYear)}
                      disabled={isCleaningData}
                    >
                      {isCleaningData ? 'Limpiando...' : 'Limpiar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}

export default Dashboard
