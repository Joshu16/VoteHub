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
const SESSION_MAX_MS = 24 * 60 * 60 * 1000

export { PRINCIPAL_ADMIN_EMAIL } from './adminUsers'

function isLoginExpired() {
  const loginAt = Number(localStorage.getItem(KEY_ADMIN_LOGIN_AT))
  if (!Number.isFinite(loginAt)) return true
  return Date.now() - loginAt >= SESSION_MAX_MS
}

export function getAdminSessionEmail() {
  return localStorage.getItem(KEY_ADMIN_EMAIL) || ''
}

export async function requestAdminLoginCode(email) {
  const em = normalizeEmail(email)
  if (!(await isAdminEmail(em))) {
    throw new Error('Este correo no tiene acceso administrativo.')
  }
  await sendLoginCode(em)
  setPendingOtp(em, 'admin')
  return em
}

export async function completeAdminLogin(email, code) {
  const pending = getPendingOtp()
  const em = normalizeEmail(email)
  if (!pending || pending.role !== 'admin' || pending.email !== em) {
    throw new Error('Verificación expirada. Vuelve a ingresar tu correo.')
  }
  if (!(await isAdminEmail(em))) {
    throw new Error('Este correo ya no tiene acceso administrativo.')
  }
  await verifyLoginCode(em, code)
  localStorage.setItem(KEY_ADMIN_EMAIL, em)
  localStorage.setItem(KEY_ADMIN_LOGIN_AT, String(Date.now()))
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
  const email = getAdminSessionEmail()
  if (!email || isLoginExpired()) {
    await signOutAdmin()
    return false
  }
  try {
    return await isAdminEmail(email)
  } catch {
    return false
  }
}

export async function signOutAdmin() {
  localStorage.removeItem(KEY_ADMIN_EMAIL)
  localStorage.removeItem(KEY_ADMIN_LOGIN_AT)
  clearPendingOtp()
}
