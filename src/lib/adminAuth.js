import { supabase } from './supabaseClient'

/* Correo permitido para panel admin */
export const ADMIN_EMAIL = 'ctpcit@gmail.com'

const PASS_LOCAL = '1234'
/* Marca local si falla login remoto y la clave coincide */
const KEY_LOCAL = 'votehub_admin_session'
const KEY_LOGIN_AT = 'votehub_admin_login_at'
const SESSION_MAX_MS = 24 * 60 * 60 * 1000

function setLoginTimestamp() {
  localStorage.setItem(KEY_LOGIN_AT, String(Date.now()))
}

function isLoginExpired() {
  const raw = localStorage.getItem(KEY_LOGIN_AT)
  if (!raw) {
    return true
  }
  const loginAt = Number(raw)
  if (!Number.isFinite(loginAt)) {
    return true
  }
  return Date.now() - loginAt >= SESSION_MAX_MS
}

export async function signInAdmin(email, password) {
  const em = email.trim().toLowerCase()
  if (em !== ADMIN_EMAIL) {
    throw new Error('Solo el correo administrador puede ingresar.')
  }

  const sesion = await supabase.auth.signInWithPassword({ email: em, password })
  if (!sesion.error) {
    localStorage.setItem(KEY_LOCAL, '0')
    setLoginTimestamp()
    return sesion.data
  }

  if (password === PASS_LOCAL) {
    localStorage.setItem(KEY_LOCAL, '1')
    setLoginTimestamp()
    return { user: { email: em } }
  }

  throw sesion.error
}

/* Sesion remota valida o respaldo local (max 24 h) */
export async function isAdminSessionActive() {
  if (isLoginExpired()) {
    await signOutAdmin()
    return false
  }

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
  localStorage.removeItem(KEY_LOGIN_AT)
  await supabase.auth.signOut()
}
