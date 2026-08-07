import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailOtpAuth'

/* Correo del administrador principal del sistema */
export const PRINCIPAL_ADMIN_EMAIL = 'ctpcit0@gmail.com'

/* Detecta si falta la tabla admin_users en Supabase */
function noHayTabla(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('admin_users') && (texto.includes('does not exist') || texto.includes('schema cache'))
}

/* Comprueba si un correo tiene rol de administrador */
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

/* Comprueba si el correo es administrador principal */
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

/* Lista todos los administradores registrados */
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
  const rows = res.data || []
  const principalNorm = normalizeEmail(PRINCIPAL_ADMIN_EMAIL)
  const hasPrincipal = rows.some(
    (row) => row.is_principal || normalizeEmail(row.email) === principalNorm,
  )
  if (!hasPrincipal) {
    return [{ id: 'principal', email: PRINCIPAL_ADMIN_EMAIL, is_principal: true }, ...rows]
  }
  return rows.map((row) =>
    normalizeEmail(row.email) === principalNorm ? { ...row, is_principal: true } : row,
  )
}

/* Agrega un nuevo administrador por correo (solo principal) */
export async function addAdminUser(email, actorEmail) {
  const em = normalizeEmail(email)
  if (!em) return { ok: false, reason: 'EMPTY' }
  if (em === normalizeEmail(PRINCIPAL_ADMIN_EMAIL)) return { ok: false, reason: 'PRINCIPAL' }
  if (!(await isPrincipalAdminEmail(actorEmail))) return { ok: false, reason: 'NOT_PRINCIPAL' }

  const res = await supabase.from('admin_users').insert({ email: em, is_principal: false })
  if (res.error) {
    if (String(res.error.code) === '23505') return { ok: false, reason: 'DUPLICATE' }
    if (noHayTabla(res.error)) return { ok: false, reason: 'NO_TABLE' }
    throw res.error
  }
  return { ok: true }
}

/* Elimina un administrador (excepto el principal) */
export async function removeAdminUser(id) {
  const res = await supabase.from('admin_users').delete().eq('id', id).eq('is_principal', false)
  if (res.error) {
    if (noHayTabla(res.error)) return
    throw res.error
  }
}
