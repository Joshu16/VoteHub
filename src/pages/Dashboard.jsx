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
} from '../lib/electionsStore'
import { formatElectionPeriod } from '../lib/electionPeriod'
import { notifyDataRefresh } from '../lib/dataRefresh'
import {
  EMPTY_PARTY_OFFICERS,
  PARTY_OFFICER_FIELDS,
  parsePartyOfficers,
  serializePartyOfficers,
} from '../lib/partyOfficers'

/* Panel de control electoral */
function Dashboard() {
  const currentYear = new Date().getFullYear()
  /* election + datos del modal de partidos */
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modalMode, setModalMode] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyOfficers, setPartyOfficers] = useState(() => ({ ...EMPTY_PARTY_OFFICERS }))
  const [partyImage, setPartyImage] = useState('')
  const [selectedParty, setSelectedParty] = useState(null)
  const [modalError, setModalError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isSavingParty, setIsSavingParty] = useState(false)
  const [isDeletingParty, setIsDeletingParty] = useState(false)
  const [isCleaningData, setIsCleaningData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stopFlowElection, setStopFlowElection] = useState(null)
  const electionYear = Number(election?.year ?? currentYear)

  /* Refresca eleccion desde servidor */
  const loadData = async ({ quiet = false } = {}) => {
    if (!quiet) {
      setIsLoading(true)
    }
    try {
      const activeElection = await getActiveElection()
      if (activeElection) {
        setElection(activeElection)
      } else {
        const existingElection = await ensureElection(currentYear)
        setElection(existingElection)
      }
    } catch (error) {
      setFeedback(`No se pudo cargar la elección: ${error?.message || 'Error desconocido'}`)
    } finally {
      if (!quiet) {
        setIsLoading(false)
      }
    }
  }

  /* Carga inicial */
  useEffect(() => {
    loadData()
  }, [currentYear])

  useEffect(() => {
    if (!modalMode) {
      document.body.classList.remove('modal-open')
      return
    }
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
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

  /* Activa elección del año actual únicamente */
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

  /* Detiene elección */
  const handleStopElection = () => {
    const targetElection = election
    if (!targetElection) {
      return
    }
    setIsStopping(true)
    stopElection(targetElection.year)
      .then(() => {
        setFeedback(`Elección finalizada: ${formatElectionPeriod(targetElection.year)}.`)
        setStopFlowElection(targetElection)
        setModalMode('stop-export')
        return loadData()
      })
      .catch((error) =>
        setFeedback(`No se pudo detener la elección: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsStopping(false))
  }

  const isElectionActive = Boolean(election?.isActive)
  const isTogglingElection = isStarting || isStopping

  /* Alterna iniciar o terminar eleccion */
  const handleToggleElection = () => {
    if (isElectionActive) {
      setModalMode('stop-election')
      return
    }
    setModalMode('start-election')
  }

  /* Cierra modal */
  const closeModal = () => {
    setModalMode('')
    setPartyName('')
    setPartyOfficers({ ...EMPTY_PARTY_OFFICERS })
    setPartyImage('')
    setSelectedParty(null)
    setStopFlowElection(null)
    setModalError('')
  }

  /* Modal nuevo partido */
  const openAddModal = () => {
    setModalMode('add')
    setPartyName('')
    setPartyOfficers({ ...EMPTY_PARTY_OFFICERS })
    setPartyImage('')
    setSelectedParty(null)
    setModalError('')
  }

  /* Modal editar partido */
  const openEditModal = (party) => {
    setModalMode('edit')
    setPartyName(party.name)
    setPartyOfficers(parsePartyOfficers(party.officers_json))
    setPartyImage(party.image_url || '')
    setSelectedParty(party)
    setModalError('')
  }

  /* Modal eliminar partido */
  const openDeleteModal = (party) => {
    setModalMode('delete')
    setPartyName(party.name)
    setPartyOfficers({ ...EMPTY_PARTY_OFFICERS })
    setPartyImage(party.image_url || '')
    setSelectedParty(party)
    setModalError('')
  }

  /* Imagen del partido (archivo) */
  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    /* Tipos permitidos */
    const isValidType = file.type === 'image/png' || file.type === 'image/jpeg'
    if (!isValidType) {
      setModalError('Solo se permite PNG o JPG.')
      return
    }

    /* Imagen en texto para vista previa y guardado */
    const reader = new FileReader()
    reader.onload = () => {
      setPartyImage(typeof reader.result === 'string' ? reader.result : '')
      setModalError('')
    }
    reader.readAsDataURL(file)
  }

  /* Guarda partido nuevo o editado */
  const handleSaveParty = () => {
    const nombre = partyName.trim()
    const presidente = (partyOfficers.presidente || '').trim()
    if (!nombre) {
      setModalError('El nombre del partido es obligatorio.')
      return
    }
    if (!partyImage) {
      setModalError('La imagen del partido es obligatoria.')
      return
    }
    if (!presidente) {
      setModalError('El nombre del presidente es obligatorio.')
      return
    }
    setModalError('')
    setIsSavingParty(true)
    /* Alta o edicion segun el modal abierto */
    const officersJson = serializePartyOfficers(partyOfficers)
    const action =
      modalMode === 'add'
        ? addParty(electionYear, partyName, partyImage, officersJson)
        : editParty(electionYear, selectedParty.id, partyName, partyImage, officersJson)
    action
      .then((result) => {
        if (!result?.ok) {
          setModalError('Nombre vacío o duplicado.')
          return
        }
        const baseMsg = modalMode === 'add' ? 'Partido agregado.' : 'Partido editado.'
        if (result.officersNotSaved) {
          setFeedback(
            `${baseMsg} Los cargos no se guardaron: en Supabase falta la columna officers_json en la tabla parties. SQL: ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS officers_json text;`,
          )
        } else {
          setFeedback(baseMsg)
        }
        closeModal()
        return loadData()
      })
      .catch((error) =>
        setModalError(`No se pudo guardar el partido: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSavingParty(false))
  }

  /* Exporta archivo de resultados */
  const handleExportData = (targetElection = election) => {
    const parties = targetElection?.parties || []
    /* Solo con elección cerrada y con datos */
    if (!targetElection || targetElection.isActive || !parties.length) {
      return
    }

    /* Lineas del archivo exportado */
    const rows = [['Periodo', 'Partido', 'Votos']]
    for (const party of parties) {
      rows.push([
        formatElectionPeriod(targetElection.year),
        party.name,
        String(party.votes || 0),
      ])
    }
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    /* Descarga con enlace temporal oculto */
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

  /* Borra partido en servidor */
  const handleDeleteParty = () => {
    setIsDeletingParty(true)
    removeParty(electionYear, selectedParty.id)
      .then(() => {
        setFeedback('Partido eliminado.')
        closeModal()
        return loadData()
      })
      .catch((error) =>
        setModalError(`No se pudo eliminar el partido: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsDeletingParty(false))
  }

  /* Vista del panel */
  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        {/* Título y año */}
        <h1>Centro de Control</h1>
        <p>Elecciones del periodo {formatElectionPeriod(electionYear)}</p>
      </header>

      <div className="action-row">
        {/* Boton de estado de eleccion y nuevo partido */}
        <button
          type="button"
          onClick={handleToggleElection}
          disabled={isTogglingElection}
          className={isElectionActive ? 'toggle-election-btn stop' : 'toggle-election-btn start'}
        >
          {isStarting
            ? 'Iniciando...'
            : isStopping
              ? 'Terminando...'
              : isElectionActive
                ? 'Terminar Elecciones'
                : 'Iniciar Elecciones'}
        </button>
        <button type="button" onClick={openAddModal} disabled={isTogglingElection}>
          Añadir Partido
        </button>
        <button
          type="button"
          className="refresh-data-btn"
          onClick={handleRefreshData}
          disabled={isRefreshing || isLoading}
        >
          {isRefreshing ? 'Actualizando...' : 'Actualizar datos'}
        </button>
      </div>
      {feedback && <p className="dashboard-feedback">{feedback}</p>}

      <p className={`election-state ${isElectionActive ? 'active' : 'inactive'}`}>
        Estado {formatElectionPeriod(electionYear)}: {isElectionActive ? 'Activa' : 'Detenida'}
      </p>

      <div className="table-wrap">
        {/* Partidos del año con acciones */}
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Votos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              (election?.parties ?? []).map((partido) => (
              <tr key={partido.id}>
                <td>{partido.name}</td>
                <td>{partido.votes}</td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => openEditModal(partido)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => openDeleteModal(partido)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
              ))}
            {isLoading && (
              <tr>
                <td colSpan={3}>Cargando...</td>
              </tr>
            )}
            {!isLoading && (election?.parties ?? []).length === 0 && (
              <tr>
                <td colSpan={3}>No hay partidos para este año.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bottom-actions">
        {/* Exportar solo si eleccion cerrada */}
        <button
          type="button"
          onClick={handleExportData}
          disabled={Boolean(election?.isActive) || (election?.parties || []).length === 0}
        >
          Exportar Datos
        </button>
        <button
          type="button"
          onClick={() => setModalMode('manual-clean-confirm')}
          disabled={Boolean(election?.isActive) || (election?.parties || []).length === 0 || isCleaningData}
        >
          Limpiar Datos
        </button>
      </div>

      {modalMode &&
        createPortal(
          <>
            {/* Modal crear editar borrar partidos */}
          <div className="modal-backdrop">
            <div
              className={`party-modal${modalMode === 'add' || modalMode === 'edit' ? ' party-modal--wide' : ''}`}
            >
            {modalMode === 'add' && <h3>Añadir partido</h3>}
            {modalMode === 'edit' && <h3>Editar partido</h3>}
            {modalMode === 'delete' && <h3>Eliminar partido</h3>}
            {modalMode === 'start-election' && <h3>Iniciar elecciones</h3>}
            {modalMode === 'stop-election' && <h3>Finalizar elecciones</h3>}
            {modalMode === 'stop-export' && <h3>Exportar datos</h3>}
            {modalMode === 'stop-clean' && <h3>Limpiar datos</h3>}
            {modalMode === 'stop-clean-confirm' && <h3>Confirmar limpieza</h3>}
            {modalMode === 'manual-clean-confirm' && <h3>Confirmar limpieza</h3>}

            {(modalMode === 'add' || modalMode === 'edit') && (
              <>
                <div className="party-form-grid">
                  <div className="party-form-column party-form-column--identity">
                    <label className="modal-text-field">
                      Nombre del partido <span className="field-required">*</span>
                      <input
                        type="text"
                        value={partyName}
                        onChange={(event) => setPartyName(event.target.value)}
                        placeholder="Nombre del partido"
                        required
                      />
                    </label>
                    <label className="file-label">
                      Imagen (PNG/JPG) <span className="field-required">*</span>
                      <input type="file" accept=".png,.jpg,.jpeg" onChange={handleImageFileChange} />
                    </label>
                    {partyImage && (
                      <img src={partyImage} alt="Vista previa" className="party-image-preview" />
                    )}
                  </div>
                  <div className="party-form-column party-form-column--officers">
                    <div className="party-officers-two-cols">
                      {PARTY_OFFICER_FIELDS.map(({ key, label, placeholder, required }) => (
                        <label key={key} className="modal-text-field">
                          {label}
                          {required ? (
                            <span className="field-required"> *</span>
                          ) : (
                            <span className="field-optional"> (opcional)</span>
                          )}
                          <input
                            type="text"
                            value={partyOfficers[key]}
                            onChange={(event) =>
                              setPartyOfficers((prev) => ({ ...prev, [key]: event.target.value }))
                            }
                            placeholder={placeholder}
                            required={Boolean(required)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {modalError && <p className="modal-error">{modalError}</p>}
                <div className="modal-actions">
                  <button type="button" className="icon-btn" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="button" className="icon-btn" onClick={handleSaveParty} disabled={isSavingParty}>
                    {isSavingParty ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            )}

            {modalMode === 'delete' && (
              <>
                <p>¿Eliminar {selectedParty?.name}?</p>
                {modalError && <p className="modal-error">{modalError}</p>}
                <div className="modal-actions">
                  <button type="button" className="icon-btn" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="button" className="icon-btn danger" onClick={handleDeleteParty} disabled={isDeletingParty}>
                    {isDeletingParty ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            )}

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
                  <button type="button" className="icon-btn" onClick={handleStartElection} disabled={isStarting}>
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
                  <button type="button" className="icon-btn danger" onClick={handleStopElection} disabled={isStopping}>
                    {isStopping ? 'Finalizando...' : 'Finalizar'}
                  </button>
                </div>
              </>
            )}

            {modalMode === 'stop-export' && (
              <>
                <p>¿Desea exportar los datos?</p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setModalMode('stop-clean')
                    }}
                  >
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
                  <button type="button" className="icon-btn danger" onClick={() => setModalMode('stop-clean-confirm')}>
                    Sí
                  </button>
                </div>
              </>
            )}

            {modalMode === 'stop-clean-confirm' && (
              <>
                <p>¿Seguro que desea limpiar los datos de {formatElectionPeriod(stopFlowElection?.year)}?</p>
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
          </div>
          </>,
          document.body,
        )}
    </section>
  )
}

export default Dashboard
