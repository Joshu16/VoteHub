import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { signOutAdmin } from '../lib/adminAuth'
import {
  addParty,
  editParty,
  ensureElection,
  removeParty,
  startElection,
  stopElection,
} from '../lib/electionsStore'

/* Panel de control electoral */
function Dashboard() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  /* election + datos del modal de partidos */
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modalMode, setModalMode] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyImage, setPartyImage] = useState('')
  const [selectedParty, setSelectedParty] = useState(null)
  const [modalError, setModalError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isSavingParty, setIsSavingParty] = useState(false)
  const [isDeletingParty, setIsDeletingParty] = useState(false)
  /* Estado modal vacio agregar editar o borrar */

  /* Refresca eleccion desde servidor */
  const loadData = async () => {
    setIsLoading(true)
    try {
      const existingElection = await ensureElection(currentYear)
      setElection(existingElection)
    } catch (error) {
      setFeedback(`No se pudo cargar la elección: ${error?.message || 'Error desconocido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  /* Carga inicial */
  useEffect(() => {
    setIsLoading(true)
    ensureElection(currentYear)
      .then((existingElection) => setElection(existingElection))
      .catch((error) =>
        setFeedback(`No se pudo cargar la elección: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsLoading(false))
  }, [currentYear])

  /* Cierra sesion del administrador */
  const handleLogout = async () => {
    await signOutAdmin()
    navigate('/admin-login')
  }

  /* Activa elección */
  const handleStartElection = () => {
    setIsStarting(true)
    startElection(currentYear)
      .then(() => {
        setFeedback('Elección iniciada.')
        return loadData()
      })
      .catch((error) =>
        setFeedback(`No se pudo iniciar la elección: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsStarting(false))
  }

  /* Detiene elección */
  const handleStopElection = () => {
    setIsStopping(true)
    stopElection(currentYear)
      .then(() => {
        setFeedback('Elección detenida.')
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
      handleStopElection()
      return
    }
    handleStartElection()
  }

  /* Cierra modal */
  const closeModal = () => {
    setModalMode('')
    setPartyName('')
    setPartyImage('')
    setSelectedParty(null)
    setModalError('')
  }

  /* Modal nuevo partido */
  const openAddModal = () => {
    setModalMode('add')
    setPartyName('')
    setPartyImage('')
    setSelectedParty(null)
    setModalError('')
  }

  /* Modal editar partido */
  const openEditModal = (party) => {
    setModalMode('edit')
    setPartyName(party.name)
    setPartyImage(party.image_url || '')
    setSelectedParty(party)
    setModalError('')
  }

  /* Modal eliminar partido */
  const openDeleteModal = (party) => {
    setModalMode('delete')
    setPartyName(party.name)
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
    setIsSavingParty(true)
    /* Alta o edicion segun el modal abierto */
    const action =
      modalMode === 'add'
        ? addParty(currentYear, partyName, partyImage)
        : editParty(currentYear, selectedParty.id, partyName, partyImage)
    action
      .then((ok) => {
        if (!ok) {
          setModalError('Nombre vacío o duplicado.')
          return
        }
        setFeedback(modalMode === 'add' ? 'Partido agregado.' : 'Partido editado.')
        closeModal()
        return loadData()
      })
      .catch((error) =>
        setModalError(`No se pudo guardar el partido: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSavingParty(false))
  }

  /* Exporta archivo de resultados */
  const handleExportData = () => {
    const parties = election?.parties || []
    /* Solo con elección cerrada y con datos */
    if (election?.isActive || !parties.length) {
      return
    }

    /* Lineas del archivo exportado */
    const rows = [['Año', 'Partido', 'Votos', 'Imagen']]
    for (const party of parties) {
      rows.push([String(currentYear), party.name, String(party.votes || 0), party.image_url || ''])
    }
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    /* Descarga con enlace temporal oculto */
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `eleccion_${currentYear}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setFeedback('Datos exportados.')
  }

  /* Borra partido en servidor */
  const handleDeleteParty = () => {
    setIsDeletingParty(true)
    removeParty(currentYear, selectedParty.id)
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
        <p>Elecciones del año {currentYear}</p>
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
      </div>
      {feedback && <p className="dashboard-feedback">{feedback}</p>}

      <p className={`election-state ${isElectionActive ? 'active' : 'inactive'}`}>
        Estado {currentYear}: {isElectionActive ? 'Activa' : 'Detenida'}
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
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      {modalMode && (
        <>
          {/* Modal crear editar borrar partidos */}
        <div className="modal-backdrop">
          <div className="party-modal">
            {modalMode === 'add' && <h3>Añadir partido</h3>}
            {modalMode === 'edit' && <h3>Editar partido</h3>}
            {modalMode === 'delete' && <h3>Eliminar partido</h3>}

            {(modalMode === 'add' || modalMode === 'edit') && (
              <>
                {/* Nombre y selector de imagen */}
                <input
                  type="text"
                  value={partyName}
                  onChange={(event) => setPartyName(event.target.value)}
                  placeholder="Nombre del partido"
                />
                <label className="file-label">
                  Imagen (PNG/JPG)
                  <input type="file" accept=".png,.jpg,.jpeg" onChange={handleImageFileChange} />
                </label>
                {partyImage && (
                  <img src={partyImage} alt="Vista previa" className="party-image-preview" />
                )}
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
          </div>
        </div>
        </>
      )}
    </section>
  )
}

export default Dashboard
