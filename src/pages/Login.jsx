import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import votandoImg from '../assets/Votando.jpg'
import { validateVoterCedula } from '../lib/voterRegistry'
import { voterDisplayName } from '../lib/voterParse'
import { getActiveElection, hasVotedInElection } from '../lib/electionsStore'
import { setVoterElectionSnapshot, setVoterEligible } from '../lib/voterSession'
import img1 from '../assets/imagenesinicio/img1.avif'
import img2 from '../assets/imagenesinicio/img2.avif'
import img3 from '../assets/imagenesinicio/img3.avif'
import img4 from '../assets/imagenesinicio/img4.jpg'
import img5 from '../assets/imagenesinicio/img5.jpg'
import img6 from '../assets/imagenesinicio/img6.jpg'
import img7 from '../assets/imagenesinicio/img7.webp'



const LOGIN_HERO_IMAGES = [votandoImg, img1, img2, img3, img4, img5, img6, img7]
const HERO_CROP_RIGHT_INDICES = new Set([4, 5, 6])
const HERO_ZOOM_TOP_INDICES = new Set([5])
const HERO_FOCUS_RIGHT_INDICES = new Set([2])
const HERO_INTERVAL_MS = 4500

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
  const [heroIndex, setHeroIndex] = useState(0)

  /* Carrusel lateral: secuencial 1..N y reinicia */
  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex((current) => (current + 1) % LOGIN_HERO_IMAGES.length)
    }, HERO_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

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
      const voter = await validateVoterCedula(normalizedCedula)

      if (!voter) {
        setError('Cédula no encontrada.')
        return
      }

      const voterName = toTitleCase(voterDisplayName(voter))
      setPendingCedula(normalizedCedula)
      setConfirmVoterName(voterName)
      return

    } catch (error) {
      const message = String(error?.message || '')
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
            ¿Estás listo/a para votar y
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
        {LOGIN_HERO_IMAGES.map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt={`Imagen de inicio ${index + 1}`}
            className={`login-hero-img${HERO_CROP_RIGHT_INDICES.has(index) ? ' login-hero-img--crop-right' : ''}${HERO_ZOOM_TOP_INDICES.has(index) ? ' login-hero-img--zoom-top' : ''}${HERO_FOCUS_RIGHT_INDICES.has(index) ? ' login-hero-img--focus-right' : ''}${heroIndex === index ? ' is-active' : ''}`}
            aria-hidden={heroIndex !== index}
          />
        ))}
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