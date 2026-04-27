import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Voting.css'
import { getActiveElection, hasVotedInElection, voteParty } from '../lib/electionsStore'
import { navigateWithTransition } from '../lib/pageTransition'

function Voting() {
  const navigate = useNavigate()
  const voterName = localStorage.getItem('voterName') || 'Estudiante'
  const voterCedula = localStorage.getItem('voterCedula') || ''
  const [activeElection, setActiveElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [modalType, setModalType] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const [confirmParty, setConfirmParty] = useState(null)

  /* Cargar elección activa y validar si ya votó */
  useEffect(() => {
    const load = async () => {
      try {
        const election = await getActiveElection()
        setActiveElection(election)
        setError('')

        if (election && voterCedula) {
          const voted = await hasVotedInElection(election.year, voterCedula)
          if (voted) {
            sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
            navigateWithTransition(navigate, '/login', { replace: true })
            return
          }
        }
      } catch {
        setActiveElection(null)
        setError('No se pudo cargar la elección activa.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate, voterCedula])

  /* Registrar voto */
  const performVote = async (party) => {
    try {
      setIsVoting(true)
      const result = await voteParty(activeElection.year, party.id, voterCedula)
      if (!result.ok && result.reason === 'ALREADY_VOTED') {
        sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
        navigateWithTransition(navigate, '/login', { replace: true })
        return
      }
      if (!result.ok) {
        setModalType('error')
        setModalMessage('No se pudo registrar el voto.')
        return
      }

      setModalType('success')
      setModalMessage('Has terminado el proceso.')
      const election = await getActiveElection()
      setActiveElection(election)
      window.setTimeout(() => {
        navigateWithTransition(navigate, '/login', { replace: true })
      }, 900)
    } catch {
      setModalType('error')
      setModalMessage('No se pudo registrar el voto.')
    } finally {
      setIsVoting(false)
    }
  }

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

  /* Vista de partidos y confirmación */
  return (
    <div className="voting-page">
      <header className="voting-header">
        <h1>Bienvenido {voterName}, realiza tu voto</h1>
      </header>

      <main className="voting-content">
        {isLoading && <p>Cargando...</p>}
        {!isLoading && error && <p>{error}</p>}
        {!isLoading && !activeElection && <p>No hay elecciones activas en este momento.</p>}
        {!isLoading && activeElection && activeElection.parties.length === 0 && (
          <p>La elección activa no tiene partidos registrados.</p>
        )}
        <div className="cards-container">
          {!isLoading &&
            (activeElection?.parties ?? []).map((party) => (
            <div className="party-card" key={party.id}>
              <div className="party-image-box" style={{ backgroundColor: '#e9e9e9' }}>
                {party.image_url ? (
                  <img src={party.image_url} alt={party.name} />
                ) : (
                  <p className="null-vote-label">{party.name.slice(0, 3).toUpperCase()}</p>
                )}
              </div>

              <div className="party-info">
                <p>{party.name}</p>
                <button onClick={() => handleVote(party)} disabled={isVoting}>
                  {isVoting ? 'Registrando...' : 'Votar'}
                </button>
              </div>
            </div>
            ))}
        </div>
      </main>

      <footer className="voting-footer">
        <p>Estudiantes de Apps 2026</p>
        <img
          src="https://complejoeducativocit.ed.cr/wp-content/uploads/2025/08/Complejo-Educativo-CIT.png"
          alt="CTP"
          style={{ width: '55px', height: '55px', objectFit: 'contain' }}
        />
      </footer>

      {modalMessage && (
        <div className="vote-modal-backdrop">
          <div className={`vote-modal ${modalType === 'success' ? 'vote-modal-success' : ''}`}>
            {modalType === 'success' && (
              <img
                className="vote-success-gif"
                src="https://media.tenor.com/6eVfQ0P6sGAAAAAC/check.gif"
                alt="Voto confirmado"
              />
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