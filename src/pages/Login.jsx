import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import { validateVoterCedulaFromExcel } from '../lib/voterExcel'
import { getActiveElection, hasVotedInElection } from '../lib/electionsStore'
import { setVoterElectionSnapshot, setVoterEligible } from '../lib/voterSession'

/* Titulo tipo nombre propio */
function toTitleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/* Cédula sin caracteres no numéricos */
function normalizeCedula(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/* Login votante */
function Login() {
  const navigate = useNavigate()
  /* Primer paso cedula en formulario */
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  /* Segundo paso nombre del padron y cedula pendiente */
  const [confirmVoterName, setConfirmVoterName] = useState('')
  const [pendingCedula, setPendingCedula] = useState('')

  /* Modal tras votar */
  useEffect(() => {
    const message = sessionStorage.getItem('votehub_voting_modal')
    if (message) {
      setModalMessage(message)
      sessionStorage.removeItem('votehub_voting_modal')
    }
  }, [])

  /* Valida cedula contra archivo padron */
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const normalizedCedula = normalizeCedula(cedula)
      if (!normalizedCedula) {
        setError('Ingresa una cédula válida.')
        return
      }

      /* Comprueba si esta en el padron */
      const voter = await validateVoterCedulaFromExcel(normalizedCedula)

      if (!voter) {
        setError('Cédula no encontrada.')
        return
      }

      const voterName = toTitleCase(voter.nombre || 'Estudiante')
      setPendingCedula(normalizedCedula)
      setConfirmVoterName(voterName)
      return

    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('Excel')) {
        setError('No se pudo validar con el archivo de cédulas.')
        return
      }
      setError('No se pudo validar la cédula en este momento.')
    } finally {
      setIsLoading(false)
    }
  }

  /* Confirma identidad y entra a votacion */
  const handleConfirmVoter = async () => {
    if (!pendingCedula || !confirmVoterName) {
      return
    }

    setError('')
    setIsLoading(true)
    setIsStarting(true)

    try {
      const activeElection = await getActiveElection()
      /* Quita el partido voto nulo del chequeo */
      const availableParties = (activeElection?.parties || []).filter(
        (party) => party.name.trim().toLowerCase() !== 'voto nulo',
      )
      if (!activeElection || availableParties.length === 0) {
        setModalMessage('No hay elecciones activas en este momento.')
        setConfirmVoterName('')
        setPendingCedula('')
        return
      }

      const voted = await hasVotedInElection(activeElection.year, pendingCedula)
      if (voted) {
        setModalMessage('Ya has votado en estas elecciones.')
        setConfirmVoterName('')
        setPendingCedula('')
        return
      }

      sessionStorage.setItem('voterCedula', pendingCedula)
      sessionStorage.setItem('voterName', confirmVoterName)
      setVoterElectionSnapshot(activeElection)
      setVoterEligible(activeElection.year, pendingCedula)
      setConfirmVoterName('')
      setPendingCedula('')
      navigate('/votacion')
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('Excel')) {
        setError('No se pudo validar con el archivo de cédulas.')
        return
      }
      setError('No se pudo validar la cédula en este momento.')
    } finally {
      setIsLoading(false)
      setIsStarting(false)
    }
  }

  /* Maquetacion de la pantalla */
  return (
    <div className="login-page">
      <div className="login-left">
        {/* Formulario cédula */}
        <div className="login-content">
          <h2 className="login-title">
            ¿Estás listo para votar y
            <br />
            hacer un cambio?
          </h2>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Cédula"
              value={cedula}
              onChange={(event) => setCedula(event.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Validando...' : 'Ingresar'}
            </button>
          </form>
          {error && <p className="login-error">{error}</p>}
        </div>
      </div>

      <div className="login-right">
        {/* Foto lateral */}
        <img src="src/assets/Votando.jpg" alt="Votación" />
        <div className="right-overlay"></div>
      </div>

      {modalMessage && (
        <div className="login-modal-backdrop">
          {/* Avisos sin eleccion o ya voto */}
          <div className="login-modal">
            <p>{modalMessage}</p>
            <button type="button" onClick={() => setModalMessage('')}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {confirmVoterName && (
        <div className="login-modal-backdrop">
          {/* Confirma el nombre del padron */}
          <div className="login-modal">
            <p>¿Eres {confirmVoterName}?</p>
            <div className="login-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setConfirmVoterName('')
                  setPendingCedula('')
                  setError('Verifica tu cédula e inténtalo de nuevo.')
                }}
              >
                No
              </button>
              <button type="button" onClick={handleConfirmVoter} disabled={isLoading}>
                {isStarting ? 'Iniciando...' : 'Sí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login