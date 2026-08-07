import { supabase } from './supabaseClient'
import {
  clearPendingOtp,
  getPendingOtp,
  normalizeEmail,
  sendLoginCode,
  setPendingOtp,
  verifyLoginCode,
} from './emailOtpAuth'
import { isAdminEmail } from './adminUsers'

const KEY_ADMIN_EMAIL = 'votehub_admin_email'
const KEY_ADMIN_LOGIN_AT = 'votehub_admin_login_at'
export const ADMIN_SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000

export { PRINCIPAL_ADMIN_EMAIL } from './adminUsers'

/* Comprueba si la sesion admin supero los 7 dias */
function isLoginExpired() {
  const loginAt = Number(localStorage.getItem(KEY_ADMIN_LOGIN_AT))
  if (!Number.isFinite(loginAt)) return false
  return Date.now() - loginAt >= ADMIN_SESSION_MAX_MS
}

/* Asegura timestamp de login si falta */
function ensureLoginTimestamp() {
  const loginAt = Number(localStorage.getItem(KEY_ADMIN_LOGIN_AT))
  if (!Number.isFinite(loginAt)) {
    localStorage.setItem(KEY_ADMIN_LOGIN_AT, String(Date.now()))
  }
}

/* Guarda correo y hora de login admin en localStorage */
function persistAdminSession(email) {
  const em = normalizeEmail(email)
  localStorage.setItem(KEY_ADMIN_EMAIL, em)
  localStorage.setItem(KEY_ADMIN_LOGIN_AT, String(Date.now()))
}

/* Limpia solo claves locales de admin (sin cerrar Supabase) */
function clearAdminLocalSession() {
  localStorage.removeItem(KEY_ADMIN_EMAIL)
  localStorage.removeItem(KEY_ADMIN_LOGIN_AT)
}

/* Lee correo de sesion admin guardado localmente */
export function getAdminSessionEmail() {
  return localStorage.getItem(KEY_ADMIN_EMAIL) || ''
}

/* Envia codigo OTP al admin tras validar correo autorizado */
export async function requestAdminLoginCode(email) {
  const em = normalizeEmail(email)
  if (!(await isAdminEmail(em))) {
    throw new Error('Este correo no tiene acceso administrativo.')
  }
  await sendLoginCode(em, { redirectPath: '/admin-login' })
  setPendingOtp(em, 'admin')
  return em
}

/* Completa login admin verificando OTP y rol */
export async function completeAdminLogin(email, code) {
  const pending = getPendingOtp()
  const em = normalizeEmail(email)
  if (!pending || pending.role !== 'admin' || pending.email !== em) {
    throw new Error('Verificación expirada. Vuelve a ingresar tu correo.')
  }
  if (!(await isAdminEmail(em))) {
    clearAdminLocalSession()
    clearPendingOtp()
    throw new Error('Este correo ya no tiene acceso administrativo.')
  }
  await verifyLoginCode(em, code, { keepSession: true })
  persistAdminSession(em)
  clearPendingOtp()
}

/* Correo pendiente de verificacion OTP de admin */
export function getPendingAdminEmail() {
  const pending = getPendingOtp()
  if (pending?.role === 'admin') return pending.email
  return ''
}

/* Indica si hay OTP de admin pendiente */
export function isAdminOtpPending() {
  const pending = getPendingOtp()
  return pending?.role === 'admin'
}

/* Cancela flujo OTP de admin */
export function cancelAdminLogin() {
  clearPendingOtp()
}

/* Comprueba si hay sesion admin activa y valida expiracion */
export async function isAdminSessionActive() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error

    const sessionEmail = data.session?.user?.email
    if (sessionEmail) {
      const em = normalizeEmail(sessionEmail)
      let ok = false
      try {
        ok = await isAdminEmail(em)
      } catch {
        clearAdminLocalSession()
        return false
      }

      if (!ok) {
        clearAdminLocalSession()
        return false
      }

      if (isLoginExpired()) {
        await signOutAdmin()
        return false
      }

      const storedEmail = getAdminSessionEmail()
      if (!storedEmail || storedEmail !== em) persistAdminSession(em)
      else ensureLoginTimestamp()
      return true
    }
  } catch {
    /* Sin sesion de Supabase: intenta solo localStorage */
  }

  const email = getAdminSessionEmail()
  if (!email) return false

  ensureLoginTimestamp()

  if (isLoginExpired()) {
    await signOutAdmin()
    return false
  }

  try {
    const ok = await isAdminEmail(email)
    if (!ok) {
      clearAdminLocalSession()
      return false
    }
    return true
  } catch {
    clearAdminLocalSession()
    return false
  }
}

/* Cierra sesion admin y limpia Supabase Auth */
export async function signOutAdmin() {
  clearAdminLocalSession()
  clearPendingOtp()
  await supabase.auth.signOut()
}
