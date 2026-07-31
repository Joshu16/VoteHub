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
export const ADMIN_SESSION_MAX_MS = 48 * 60 * 60 * 1000

export { PRINCIPAL_ADMIN_EMAIL } from './adminUsers'

function isLoginExpired() {
  const loginAt = Number(localStorage.getItem(KEY_ADMIN_LOGIN_AT))
  if (!Number.isFinite(loginAt)) return false
  return Date.now() - loginAt >= ADMIN_SESSION_MAX_MS
}

function ensureLoginTimestamp() {
  const loginAt = Number(localStorage.getItem(KEY_ADMIN_LOGIN_AT))
  if (!Number.isFinite(loginAt)) {
    localStorage.setItem(KEY_ADMIN_LOGIN_AT, String(Date.now()))
  }
}

function persistAdminSession(email) {
  const em = normalizeEmail(email)
  localStorage.setItem(KEY_ADMIN_EMAIL, em)
  localStorage.setItem(KEY_ADMIN_LOGIN_AT, String(Date.now()))
}

export function getAdminSessionEmail() {
  return localStorage.getItem(KEY_ADMIN_EMAIL) || ''
}

async function syncAdminSessionFromSupabase() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const sessionEmail = data.session?.user?.email
  if (!sessionEmail) return null

  const em = normalizeEmail(sessionEmail)
  if (!(await isAdminEmail(em))) return null

  const storedEmail = getAdminSessionEmail()
  if (!storedEmail || storedEmail !== em) {
    persistAdminSession(em)
  } else {
    ensureLoginTimestamp()
  }

  return em
}

export async function requestAdminLoginCode(email) {
  const em = normalizeEmail(email)
  if (!(await isAdminEmail(em))) {
    throw new Error('Este correo no tiene acceso administrativo.')
  }
  await sendLoginCode(em, { redirectPath: '/admin-login' })
  setPendingOtp(em, 'admin')
  return em
}

export async function completeAdminLogin(email, code) {
  const pending = getPendingOtp()
  const em = normalizeEmail(email)
  if (!pending || pending.role !== 'admin' || pending.email !== em) {
    throw new Error('Verificacion expirada. Vuelve a ingresar tu correo.')
  }
  if (!(await isAdminEmail(em))) {
    throw new Error('Este correo ya no tiene acceso administrativo.')
  }
  await verifyLoginCode(em, code, { keepSession: true })
  persistAdminSession(em)
  clearPendingOtp()
}

export function getPendingAdminEmail() {
  const pending = getPendingOtp()
  if (pending?.role === 'admin') return pending.email
  return ''
}

export function isAdminOtpPending() {
  const pending = getPendingOtp()
  return pending?.role === 'admin'
}

export function cancelAdminLogin() {
  clearPendingOtp()
}

export async function isAdminSessionActive() {
  try {
    const syncedEmail = await syncAdminSessionFromSupabase()
    if (syncedEmail) {
      if (isLoginExpired()) {
        await signOutAdmin()
        return false
      }
      return true
    }
  } catch {
    /* Sigue con la sesion guardada localmente */
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
    if (!ok) await signOutAdmin()
    return ok
  } catch {
    return true
  }
}

export async function signOutAdmin() {
  localStorage.removeItem(KEY_ADMIN_EMAIL)
  localStorage.removeItem(KEY_ADMIN_LOGIN_AT)
  clearPendingOtp()
  await supabase.auth.signOut()
}
