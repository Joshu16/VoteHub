import { supabase } from './supabaseClient'

/* Correo permitido para panel admin */
export const ADMIN_EMAIL = 'ctpcit@gmail.com'

const PASS_LOCAL = '1234'
/* Marca local si falla login remoto y la clave coincide */
const KEY_LOCAL = 'votehub_admin_session'

export async function signInAdmin(email, password) {
  const em = email.trim().toLowerCase()
  if (em !== ADMIN_EMAIL) {
    throw new Error('Solo el correo administrador puede ingresar.')
  }

  const sesion = await supabase.auth.signInWithPassword({ email: em, password })
  if (!sesion.error) {
    localStorage.setItem(KEY_LOCAL, '0')
    return sesion.data
  }

  if (password === PASS_LOCAL) {
    localStorage.setItem(KEY_LOCAL, '1')
    return { user: { email: em } }
  }

  throw sesion.error
}

/* Sesion remota valida o respaldo local */
export async function isAdminSessionActive() {
  if (localStorage.getItem(KEY_LOCAL) === '1') {
    return true
  }

  const sesion = await supabase.auth.getSession()
  if (sesion.error) {
    return false
  }

  const em = sesion.data.session?.user?.email?.toLowerCase()
  return em === ADMIN_EMAIL
}

/* Quita marca local y cierra sesion remota */
export async function signOutAdmin() {
  localStorage.removeItem(KEY_LOCAL)
  await supabase.auth.signOut()
}
