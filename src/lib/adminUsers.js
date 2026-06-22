import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailOtpAuth'

export const PRINCIPAL_ADMIN_EMAIL = 'jsaborio1604@gmail.com'

function noHayTabla(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('admin_users') && (texto.includes('does not exist') || texto.includes('schema cache'))
}

export async function isAdminEmail(email) {
  const em = normalizeEmail(email)
  if (!em) return false
  if (em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)) return true

  const res = await supabase.from('admin_users').select('id').eq('email', em).limit(1).maybeSingle()
  if (res.error) {
    if (noHayTabla(res.error)) return em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)
    throw res.error
  }
  return Boolean(res.data)
}

export async function isPrincipalAdminEmail(email) {
  const em = normalizeEmail(email)
  if (em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)) return true

  const res = await supabase
    .from('admin_users')
    .select('is_principal')
    .eq('email', em)
    .limit(1)
    .maybeSingle()
  if (res.error) {
    if (noHayTabla(res.error)) return em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)
    throw res.error
  }
  return Boolean(res.data?.is_principal)
}

export async function listAdminUsers() {
  const res = await supabase
    .from('admin_users')
    .select('id, email, is_principal, created_at')
    .order('created_at', { ascending: true })
  if (res.error) {
    if (noHayTabla(res.error)) {
      return [{ id: 'principal', email: PRINCIPAL_ADMIN_EMAIL, is_principal: true }]
    }
    throw res.error
  }
  return res.data || []
}

export async function addAdminUser(email) {
  const em = normalizeEmail(email)
  if (!em) return { ok: false, reason: 'EMPTY' }
  if (em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)) return { ok: false, reason: 'PRINCIPAL' }

  const res = await supabase.from('admin_users').insert({ email: em, is_principal: false })
  if (res.error) {
    if (String(res.error.code) === '23505') return { ok: false, reason: 'DUPLICATE' }
    if (noHayTabla(res.error)) return { ok: false, reason: 'NO_TABLE' }
    throw res.error
  }
  return { ok: true }
}

export async function removeAdminUser(id) {
  const res = await supabase.from('admin_users').delete().eq('id', id).eq('is_principal', false)
  if (res.error) {
    if (noHayTabla(res.error)) return
    throw res.error
  }
}
