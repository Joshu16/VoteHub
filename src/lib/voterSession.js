const KEY_CEDULA = 'voterCedula'
const KEY_NOMBRE = 'voterName'
const KEY_ELECTION = 'votehub_voter_election'
const KEY_ELIGIBLE = 'votehub_voter_eligible'

/* Normaliza cedula dejando solo digitos */
function normalizeCedula(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/* Guarda eleccion validada en login para no volver a pedirla en votacion */
export function setVoterElectionSnapshot(election) {
  if (!election) {
    return
  }
  sessionStorage.setItem(
    KEY_ELECTION,
    JSON.stringify({
      id: election.id,
      year: election.year,
      isActive: election.isActive,
      parties: election.parties || [],
    }),
  )
}

export function getVoterElectionSnapshot() {
  const raw = sessionStorage.getItem(KEY_ELECTION)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* Marca cedula autorizada a votar en el año tras chequeo en login */
export function setVoterEligible(year, cedula) {
  sessionStorage.setItem(KEY_ELIGIBLE, `${year}:${normalizeCedula(cedula)}`)
}

export function isVoterEligibleForElection(year, cedula) {
  return sessionStorage.getItem(KEY_ELIGIBLE) === `${year}:${normalizeCedula(cedula)}`
}

/* Borra datos de votante en almacenamiento del navegador */
export function clearVoterSession() {
  sessionStorage.removeItem(KEY_CEDULA)
  sessionStorage.removeItem(KEY_NOMBRE)
  sessionStorage.removeItem(KEY_ELECTION)
  sessionStorage.removeItem(KEY_ELIGIBLE)
  localStorage.removeItem(KEY_CEDULA)
  localStorage.removeItem(KEY_NOMBRE)
}

/* Votacion requiere cedula y nombre guardados */
export function isVoterSessionReady() {
  const cedula = String(sessionStorage.getItem(KEY_CEDULA) ?? '').replace(/\D/g, '')
  const nombre = String(sessionStorage.getItem(KEY_NOMBRE) ?? '').trim()
  return cedula.length > 0 && nombre.length > 0
}
