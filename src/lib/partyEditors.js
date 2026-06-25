import { supabase } from './supabaseClient'
import {
  clearPendingOtp,
  getPendingOtp,
  normalizeEmail,
  sendLoginCode,
  setPendingOtp,
  verifyLoginCode,
} from './emailOtpAuth'

const KEY_EDITOR_SESSION = 'votehub_editor_session'
const KEY_EDITOR_LOGIN_AT = 'votehub_editor_login_at'
const SESSION_MAX_MS = 24 * 60 * 60 * 1000

function noHayTabla(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('party_editors') && (texto.includes('does not exist') || texto.includes('schema cache'))
}

function noHayColumnaEmail(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('editor_email')
}

export async function listPartyEditors() {
  const selects = [
    'id, editor_email, voter_name, party_id, created_at, parties(name)',
    'id, voter_cedula, voter_name, party_id, created_at, parties(name)',
    'id, voter_cedula, voter_name, created_at',
  ]
  for (const sel of selects) {
    const res = await supabase
      .from('party_editors')
      .select(sel)
      .order('created_at', { ascending: false })
    if (!res.error) {
      return (res.data || []).map((row) => ({
        ...row,
        party_name: row.parties?.name ?? null,
        display_email: row.editor_email || row.voter_cedula || '',
      }))
    }
    if (noHayTabla(res.error)) return []
  }
  return []
}

export async function addPartyEditor(email, name, partyId) {
  const editor_email = normalizeEmail(email)
  const voter_name = String(name || '').trim()
  const party_id = partyId || null
  if (!editor_email) return { ok: false, reason: 'EMPTY' }
  if (!party_id) return { ok: false, reason: 'NO_PARTY' }

  let res = await supabase.from('party_editors').insert({ editor_email, voter_name, party_id })
  if (res.error && noHayColumnaEmail(res.error)) {
    res = await supabase.from('party_editors').insert({
      voter_cedula: editor_email,
      voter_name,
      party_id,
    })
  }
  if (res.error) {
    if (String(res.error.code) === '23505') return { ok: false, reason: 'DUPLICATE' }
    if (noHayTabla(res.error)) return { ok: false, reason: 'NO_TABLE' }
    throw res.error
  }
  return { ok: true }
}

export async function removePartyEditor(id) {
  const res = await supabase.from('party_editors').delete().eq('id', id)
  if (res.error && !noHayTabla(res.error)) throw res.error
}

async function buscarEditorPorEmail(email) {
  const em = normalizeEmail(email)
  if (!em) return null

  const porEmail = await supabase
    .from('party_editors')
    .select('id, editor_email, voter_name, party_id, parties(id, name, image_url, mascot_url, officers_json, election_id)')
    .eq('editor_email', em)
    .limit(1)
    .maybeSingle()
  if (!porEmail.error && porEmail.data) return porEmail.data

  const porLegacy = await supabase
    .from('party_editors')
    .select('id, voter_cedula, voter_name, party_id, parties(id, name, image_url, mascot_url, officers_json, election_id)')
    .eq('voter_cedula', em)
    .limit(1)
    .maybeSingle()
  if (!porLegacy.error && porLegacy.data) return porLegacy.data

  if (porEmail.error && noHayTabla(porEmail.error)) return null
  return null
}

export async function getEditorAssignment(email) {
  const row = await buscarEditorPorEmail(email)
  if (!row) return null
  const party = row.parties
  return {
    editorId: row.id,
    email: row.editor_email || row.voter_cedula,
    name: row.voter_name,
    partyId: row.party_id ?? party?.id ?? null,
    party,
  }
}

export async function requestEditorLoginCode(email) {
  const em = normalizeEmail(email)
  const assignment = await getEditorAssignment(em)
  if (!assignment?.partyId) {
    throw new Error('Este correo no tiene un partido asignado.')
  }
  await sendLoginCode(em)
  setPendingOtp(em, 'editor')
  return em
}

export async function completeEditorLogin(email, code) {
  const pending = getPendingOtp()
  const em = normalizeEmail(email)
  if (!pending || pending.role !== 'editor' || pending.email !== em) {
    throw new Error('Verificación expirada. Vuelve a ingresar tu correo.')
  }
  const assignment = await getEditorAssignment(em)
  if (!assignment?.partyId) {
    throw new Error('Este correo ya no tiene un partido asignado.')
  }
  await verifyLoginCode(em, code, { keepSession: true })
  setEditorSession(em, assignment.name, assignment.partyId)
  clearPendingOtp()
}

export function getPendingEditorEmail() {
  const pending = getPendingOtp()
  if (pending?.role === 'editor') return pending.email
  return ''
}

export function isEditorOtpPending() {
  return getPendingOtp()?.role === 'editor'
}

export function setEditorSession(email, name, partyId) {
  sessionStorage.setItem(
    KEY_EDITOR_SESSION,
    JSON.stringify({
      email: normalizeEmail(email),
      name: String(name || '').trim(),
      partyId: partyId || null,
    }),
  )
  sessionStorage.setItem(KEY_EDITOR_LOGIN_AT, String(Date.now()))
}

export async function clearEditorSession() {
  sessionStorage.removeItem(KEY_EDITOR_SESSION)
  sessionStorage.removeItem(KEY_EDITOR_LOGIN_AT)
  clearPendingOtp()
  await supabase.auth.signOut()
}

export function getEditorSession() {
  const raw = sessionStorage.getItem(KEY_EDITOR_SESSION)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    const loginAt = Number(sessionStorage.getItem(KEY_EDITOR_LOGIN_AT))
    if (!Number.isFinite(loginAt) || Date.now() - loginAt >= SESSION_MAX_MS) {
      clearEditorSession()
      return null
    }
    if (!data?.email) return null
    return data
  } catch {
    return null
  }
}

export function isEditorSessionActive() {
  return Boolean(getEditorSession())
}

export async function validateEditorSession() {
  const session = getEditorSession()
  if (!session?.email) return false

  try {
    const assignment = await getEditorAssignment(session.email)
    if (!assignment?.partyId) {
      clearEditorSession()
      return false
    }
    return true
  } catch {
    clearEditorSession()
    return false
  }
}

export async function isEditorSessionActiveAsync() {
  if (!getEditorSession()) return false
  return validateEditorSession()
}
