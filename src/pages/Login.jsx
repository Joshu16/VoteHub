import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import { validateVoterCedulaFromExcel } from '../lib/voterExcel'
import { getActiveElection, hasVotedInElection } from '../lib/electionsStore'

/* Formato de nombre */
/* Mayúscula al inicio de cada palabra */
function toTitleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/* Estado del formulario */
/* Login de votante */
function Login() {
  const navigate = useNavigate()
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  /* Mostrar modal pendiente si viene de votación */
  useEffect(() => {
    const message = sessionStorage.getItem('votehub_voting_modal')
    if (message) {
      setModalMessage(message)
      sessionStorage.removeItem('votehub_voting_modal')
    }
  }, [])

  /* Validar cédula y dejar pasar a votar */
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const voter = await validateVoterCedulaFromExcel(cedula)

      if (!voter) {
        setError('Cédula no encontrada en el padrón.')
        return
      }

      const activeElection = await getActiveElection()
      if (activeElection) {
        const voted = await hasVotedInElection(activeElection.year, cedula.trim())
        if (voted) {
          setModalMessage('Ya has votado en estas elecciones.')
          return
        }
      }

      localStorage.setItem('voterCedula', cedula.trim())
      localStorage.setItem('voterName', toTitleCase(voter.nombre || 'Estudiante'))
      navigate('/votacion')
    } catch {
      setError('No se pudo validar con el archivo de cédulas.')
    } finally {
      setIsLoading(false)
    }
  }

  /* Layout del login y modal */
  return (
    <div className="login-page">
      <div className="login-left">
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
              {isLoading ? 'Validando...' : 'Iniciar sesión'}
            </button>
          </form>
          {error && <p className="login-error">{error}</p>}
        </div>
      </div>

      <div className="login-right">
        <img src="src/assets/Votando.jpg" alt="Votación" />
        <div className="right-overlay"></div>
      </div>

      {modalMessage && (
        <div className="login-modal-backdrop">
          <div className="login-modal">
            <p>{modalMessage}</p>
            <button type="button" onClick={() => setModalMessage('')}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login