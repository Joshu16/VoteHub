const KEY_CEDULA = 'voterCedula'
const KEY_NOMBRE = 'voterName'

/* Borra datos de votante en almacenamiento del navegador */
export function clearVoterSession() {
  sessionStorage.removeItem(KEY_CEDULA)
  sessionStorage.removeItem(KEY_NOMBRE)
  localStorage.removeItem(KEY_CEDULA)
  localStorage.removeItem(KEY_NOMBRE)
}

/* Votacion requiere cedula y nombre guardados */
export function isVoterSessionReady() {
  const cedula = String(sessionStorage.getItem(KEY_CEDULA) ?? '').replace(/\D/g, '')
  const nombre = String(sessionStorage.getItem(KEY_NOMBRE) ?? '').trim()
  return cedula.length > 0 && nombre.length > 0
}
