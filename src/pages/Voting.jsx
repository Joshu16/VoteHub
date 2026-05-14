import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Voting.css'
import { getActiveElection, hasVotedInElection, voteParty } from '../lib/electionsStore'
import { getPresidenteNombre } from '../lib/partyOfficers'

function etiquetaSinImagenPartido(nombrePartido) {
  const n = (nombrePartido || '').trim().toLowerCase()
  if (n === 'voto nulo') {
    return 'NUlo'
  }
  return (nombrePartido || '').slice(0, 3).toUpperCase()
}

/* Flujo de voto del estudiante */
function Voting() {
  const navigate = useNavigate()
  /* Sesion corta se borra al cambiar de pantalla */
  const voterName = sessionStorage.getItem('voterName') || ''
  const voterCedula = sessionStorage.getItem('voterCedula') || ''
  const [activeElection, setActiveElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  /* Mensaje modal de exito o error al votar */
  const [modalMessage, setModalMessage] = useState('')
  const [modalType, setModalType] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  /* Partido elegido antes de confirmar */
  const [confirmParty, setConfirmParty] = useState(null)

  /* Carga elección y chequeo de voto */
  useEffect(() => {
    const load = async () => {
      try {
        const election = await getActiveElection()
        setActiveElection(election)
        setError('')

        /* Evita pantalla de voto si ya votó */
        if (election && voterCedula) {
          const voted = await hasVotedInElection(election.year, voterCedula)
          if (voted) {
            sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
            navigate('/login', { replace: true })
            return
          }
        }
      } catch {
        /* Fallo de red o servidor */
        setActiveElection(null)
        setError('No se pudo cargar la elección activa.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate, voterCedula])

  /* Envía voto */
  const performVote = async (party) => {
    try {
      setIsVoting(true)
      const result = await voteParty(activeElection.year, party.id, voterCedula)
      if (!result.ok && result.reason === 'ALREADY_VOTED') {
        sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
        navigate('/login', { replace: true })
        return
      }
      if (!result.ok) {
        setModalType('error')
        setModalMessage('No se pudo registrar el voto.')
        return
      }

      /* Exito mensaje corto y vuelta al login */
      setModalType('success')
      setModalMessage('Has terminado el proceso.')
      const election = await getActiveElection()
      setActiveElection(election)
      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1300)
    } catch {
      setModalType('error')
      setModalMessage('No se pudo registrar el voto.')
    } finally {
      setIsVoting(false)
    }
  }

  /* Abre modal de confirmación o mensaje de error */
  const handleVote = async (party) => {
    if (isVoting) {
      return
    }

    if (!activeElection) {
      setModalMessage('No hay elecciones activas.')
      return
    }

    if (!voterCedula) {
      setModalMessage('Debes iniciar sesión para votar.')
      return
    }

    setConfirmParty(party)
  }

  /* Tarjetas y modales */
  return (
    <div className="voting-page">
      <header className="voting-header">
        {/* Saludo con nombre del padrón */}
        <h1>Bienvenido {voterName}, realiza tu voto</h1>
      </header>

      <main className="voting-content">
        {/* Estados sin datos error o cargando */}
        {isLoading && <p>Cargando...</p>}
        {!isLoading && error && <p>{error}</p>}
        {!isLoading && !activeElection && <p>No hay elecciones activas en este momento.</p>}
        {!isLoading && activeElection && activeElection.parties.length === 0 && (
          <p>La elección activa no tiene partidos registrados.</p>
        )}
        <div className="cards-container">
          {/* Una tarjeta por partido */}
          {!isLoading &&
            (activeElection?.parties ?? []).map((party) => {
              const presidente = getPresidenteNombre(party.officers_json)
              return (
            <div className="party-card" key={party.id}>
              <div className="party-image-box" style={{ backgroundColor: '#e9e9e9' }}>
                {party.image_url ? (
                  <img src={party.image_url} alt={party.name} />
                ) : (
                  <p
                    className={`null-vote-label${party.name.trim().toLowerCase() === 'voto nulo' ? ' null-vote-label--nulo' : ''}`}
                  >
                    {etiquetaSinImagenPartido(party.name)}
                  </p>
                )}
              </div>

              <div className="party-info">
                <p className="party-name-line">{party.name}</p>
                {presidente && <p className="party-presidente-line">Presidente: {presidente}</p>}
                <button onClick={() => handleVote(party)} disabled={isVoting}>
                  {isVoting ? 'Registrando...' : 'Votar'}
                </button>
              </div>
            </div>
              )
            })}
        </div>
      </main>

      <footer className="voting-footer">
        {/* Pie institucional */}
        <p>Estudiantes de Apps 2026</p>
        <img
          src="https://complejoeducativocit.ed.cr/wp-content/uploads/2025/08/Complejo-Educativo-CIT.png"
          alt="CTP"
          style={{ width: '55px', height: '55px', objectFit: 'contain' }}
        />
      </footer>

      {modalMessage && (
        <div className="vote-modal-backdrop">
          {/* Modal exito con icono animado */}
          <div className={`vote-modal ${modalType === 'success' ? 'vote-modal-success' : ''}`}>
            {modalType === 'success' && (
              <div className="vote-uncheck-wrap" role="img" aria-label="Proceso finalizado">
                <svg className="vote-uncheck-svg" viewBox="0 0 120 120" aria-hidden>
                  <rect x="22" y="22" width="76" height="76" rx="12" className="vote-uncheck-box" />
                  <path d="M40 40 L80 80" className="vote-uncheck-leg vote-uncheck-leg-a" />
                  <path d="M80 40 L40 80" className="vote-uncheck-leg vote-uncheck-leg-b" />
                </svg>
              </div>
            )}
            <p>{modalMessage}</p>
            {modalType !== 'success' && (
              <button
                type="button"
                onClick={() => {
                  setModalMessage('')
                  setModalType('')
                }}
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      )}

      {confirmParty && (
        <div className="vote-modal-backdrop">
          <div className="vote-modal">
            <p>Vas a votar por {confirmParty.name}. ¿Deseas continuar?</p>
            <div className="vote-modal-actions">
              <button type="button" onClick={() => setConfirmParty(null)} disabled={isVoting}>
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  const partyToVote = confirmParty
                  setConfirmParty(null)
                  await performVote(partyToVote)
                }}
                disabled={isVoting}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Voting