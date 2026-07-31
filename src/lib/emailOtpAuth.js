import { supabase } from './supabaseClient'

const KEY_PENDING_EMAIL = 'votehub_otp_email'
const KEY_PENDING_ROLE = 'votehub_otp_role'

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function authRedirectUrl(path = '/') {
  if (typeof window === 'undefined') return undefined
  const base = String(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
  const route = path.startsWith('/') ? path : `/${path}`
  return `${base}${route}`
}

export async function sendLoginCode(email, { redirectPath = '/' } = {}) {
  const em = normalizeEmail(email)
  const emailRedirectTo = authRedirectUrl(redirectPath)
  const res = await supabase.auth.signInWithOtp({
    email: em,
    options: {
      shouldCreateUser: true,
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  })
  if (res.error) throw res.error
  return em
}

export async function verifyLoginCode(email, token, { keepSession = false } = {}) {
  const em = normalizeEmail(email)
  const res = await supabase.auth.verifyOtp({
    email: em,
    token: String(token || '').trim(),
    type: 'email',
  })
  if (res.error) throw res.error
  if (!keepSession) await supabase.auth.signOut()
  return em
}

export function setPendingOtp(email, role) {
  sessionStorage.setItem(KEY_PENDING_EMAIL, normalizeEmail(email))
  sessionStorage.setItem(KEY_PENDING_ROLE, role)
}

export function getPendingOtp() {
  const email = sessionStorage.getItem(KEY_PENDING_EMAIL)
  const role = sessionStorage.getItem(KEY_PENDING_ROLE)
  if (!email || !role) return null
  return { email, role }
}

export function clearPendingOtp() {
  sessionStorage.removeItem(KEY_PENDING_EMAIL)
  sessionStorage.removeItem(KEY_PENDING_ROLE)
}
