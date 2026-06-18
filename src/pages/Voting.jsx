import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Voting.css'
import { getActiveElection, hasVotedInElection, voteParty } from '../lib/electionsStore'
import { getPresidenteNombre } from '../lib/partyOfficers'
import {
  getVoterElectionSnapshot,
  isVoterEligibleForElection,
  setVoterElectionSnapshot,
} from '../lib/voterSession'

function etiquetaSinImagenPartido(nombrePartido) {
  const n = (nombrePartido || '').trim().toLowerCase()
  if (n === 'voto nulo') {
    return 'Nulo'
  }
  return (nombrePartido || '').slice(0, 3).toUpperCase()
}

function esVotoNulo(nombrePartido) {
  return String(nombrePartido || '').trim().toLowerCase() === 'voto nulo'
}

function ordenarPartidosParaVoto(parties) {
  return [...(parties || [])].sort((a, b) => {
    const aNulo = esVotoNulo(a.name)
    const bNulo = esVotoNulo(b.name)
    if (aNulo && !bNulo) return 1
    if (!aNulo && bNulo) return -1
    return 0
  })
}

const FONDO_IMAGEN_CARD = '#ffffff'

async function cargarImagen(src) {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const res = await fetch(src)
  if (!res.ok) throw new Error('No se pudo cargar la imagen')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function colorEsquinaSuperiorIzquierda(img) {
  const ancho = img.naturalWidth
  const alto = img.naturalHeight
  if (!ancho || !alto) return FONDO_IMAGEN_CARD

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return FONDO_IMAGEN_CARD

  ctx.drawImage(img, 0, 0)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

async function obtenerFondoDesdeImagen(src) {
  try {
    const img = await cargarImagen(src)
    return colorEsquinaSuperiorIzquierda(img)
  } catch {
    return FONDO_IMAGEN_CARD
  }
}

function PartyImageBox({ src, alt }) {
  const [fondo, setFondo] = useState(FONDO_IMAGEN_CARD)

  useEffect(() => {
    let activo = true
    obtenerFondoDesdeImagen(src).then((color) => {
      if (activo) setFondo(color)
    })
    return () => {
      activo = false
    }
  }, [src])

  return (
    <div className="party-image-box" style={{ backgroundColor: fondo }}>
      <img src={src} alt={alt} className="party-image-fg" />
    </div>
  )
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

  /* Usa eleccion guardada en login; solo consulta servidor si falta */
  useEffect(() => {
    const load = async () => {
      const cached = getVoterElectionSnapshot()
      if (cached) {
        setActiveElection(cached)
        setError('')
        setIsLoading(false)

        if (voterCedula && !isVoterEligibleForElection(cached.year, voterCedula)) {
          try {
            const voted = await hasVotedInElection(cached.year, voterCedula)
            if (voted) {
              sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
              navigate('/login', { replace: true })
            }
          } catch {
            setError('No se pudo verificar tu voto.')
          }
        }
        return
      }

      try {
        const election = await getActiveElection()
        setActiveElection(election)
        setError('')
        if (election) {
          setVoterElectionSnapshot(election)
        }

        if (election && voterCedula && !isVoterEligibleForElection(election.year, voterCedula)) {
          const voted = await hasVotedInElection(election.year, voterCedula)
          if (voted) {
            sessionStorage.setItem('votehub_voting_modal', 'Ya has votado en estas elecciones.')
            navigate('/login', { replace: true })
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
            ordenarPartidosParaVoto(activeElection?.parties).map((party) => {
              const presidente = getPresidenteNombre(party.officers_json)
              return (
            <div className="party-card" key={party.id}>
              {party.image_url ? (
                <PartyImageBox src={party.image_url} alt={party.name} />
              ) : (
                <div className="party-image-box party-image-box--empty">
                  <p
                    className={`null-vote-label${party.name.trim().toLowerCase() === 'voto nulo' ? ' null-vote-label--nulo' : ''}`}
                  >
                    {etiquetaSinImagenPartido(party.name)}
                  </p>
                </div>
              )}

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
        <p>Complejo Educativo CIT</p>
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
              <div className="vote-check-wrap" role="img" aria-label="Voto registrado">
                <svg className="vote-check-svg" viewBox="0 0 120 120" aria-hidden>
                  <circle cx="60" cy="60" r="44" className="vote-check-circle" />
                  <path d="M38 62 L54 78 L84 44" className="vote-check-mark" />
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