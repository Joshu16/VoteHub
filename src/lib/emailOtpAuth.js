import { supabase } from './supabaseClient'

const KEY_PENDING_EMAIL = 'votehub_otp_email'
const KEY_PENDING_ROLE = 'votehub_otp_role'

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function sendLoginCode(email) {
  const em = normalizeEmail(email)
  const res = await supabase.auth.signInWithOtp({
    email: em,
    options: { shouldCreateUser: true },
  })
  if (res.error) throw res.error
  return em
}

export async function verifyLoginCode(email, token) {
  const em = normalizeEmail(email)
  const res = await supabase.auth.verifyOtp({
    email: em,
    token: String(token || '').trim(),
    type: 'email',
  })
  if (res.error) throw res.error
  await supabase.auth.signOut()
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
