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
const SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000

/* Detecta si falta la tabla party_editors */
function noHayTabla(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('party_editors') && (texto.includes('does not exist') || texto.includes('schema cache'))
}

/* Detecta error por columna editor_email faltante (esquema legacy) */
function noHayColumnaEmail(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('editor_email')
}

/* La BD antigua exige voter_cedula NOT NULL aunque el login sea por correo */
function requiereVoterCedulaLegacy(err) {
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return texto.includes('voter_cedula') && texto.includes('null')
}

/* Lista editores con nombre de partido asociado */
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

/* Asigna un editor a un partido solo por correo */
export async function addPartyEditor(email, name, partyId) {
  const editor_email = normalizeEmail(email)
  const voter_name = String(name || '').trim()
  const party_id = partyId || null
  if (!editor_email) return { ok: false, reason: 'EMPTY' }
  if (!party_id) return { ok: false, reason: 'NO_PARTY' }

  const payloads = [
    { editor_email, voter_name, party_id },
    { editor_email, voter_cedula: editor_email, voter_name, party_id },
    { voter_cedula: editor_email, voter_name, party_id },
    { editor_email, voter_cedula: editor_email, voter_name },
    { voter_cedula: editor_email, voter_name },
  ]

  let lastError = null
  for (const payload of payloads) {
    const res = await supabase.from('party_editors').insert(payload)
    if (!res.error) return { ok: true }
    lastError = res.error
    if (String(res.error.code) === '23505') return { ok: false, reason: 'DUPLICATE' }
    if (noHayTabla(res.error)) return { ok: false, reason: 'NO_TABLE' }
    if (!noHayColumnaEmail(res.error) && !requiereVoterCedulaLegacy(res.error) && !noHayColumna(res.error)) {
      break
    }
  }

  if (lastError) throw lastError
  return { ok: false, reason: 'UNKNOWN' }
}

/* Detecta error generico por columna faltante */
function noHayColumna(err) {
  const texto = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase()
  return texto.includes('column') || texto.includes('schema cache') || String(err?.code || '') === 'PGRST204'
}

/* Elimina un editor de partido */
export async function removePartyEditor(id) {
  const res = await supabase.from('party_editors').delete().eq('id', id)
  if (res.error && !noHayTabla(res.error)) throw res.error
}

/* Busca editor por correo en columnas nuevas o legacy */
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

/* Obtiene partido asignado a un editor por correo */
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

/* Envia codigo OTP al editor tras validar asignacion */
export async function requestEditorLoginCode(email) {
  const em = normalizeEmail(email)
  const assignment = await getEditorAssignment(em)
  if (!assignment?.partyId) {
    throw new Error('Este correo no tiene un partido asignado.')
  }
  await sendLoginCode(em, { redirectPath: '/editor-login' })
  setPendingOtp(em, 'editor')
  return em
}

/* Completa login del editor verificando OTP y asignacion */
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

/* Correo pendiente de verificacion OTP de editor */
export function getPendingEditorEmail() {
  const pending = getPendingOtp()
  if (pending?.role === 'editor') return pending.email
  return ''
}

/* Indica si hay OTP de editor pendiente */
export function isEditorOtpPending() {
  return getPendingOtp()?.role === 'editor'
}

/* Guarda sesion del editor en localStorage */
export function setEditorSession(email, name, partyId) {
  localStorage.setItem(
    KEY_EDITOR_SESSION,
    JSON.stringify({
      email: normalizeEmail(email),
      name: String(name || '').trim(),
      partyId: partyId || null,
    }),
  )
  localStorage.setItem(KEY_EDITOR_LOGIN_AT, String(Date.now()))
}

/* Cierra sesion del editor y limpia Supabase Auth */
export async function clearEditorSession() {
  localStorage.removeItem(KEY_EDITOR_SESSION)
  localStorage.removeItem(KEY_EDITOR_LOGIN_AT)
  clearPendingOtp()
  await supabase.auth.signOut()
}

/* Lee sesion del editor validando expiracion de 7 dias */
export function getEditorSession() {
  const raw = localStorage.getItem(KEY_EDITOR_SESSION)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    const loginAt = Number(localStorage.getItem(KEY_EDITOR_LOGIN_AT))
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

/* Comprueba si hay sesion de editor activa localmente */
export function isEditorSessionActive() {
  return Boolean(getEditorSession())
}

/* Valida que el editor siga asignado a un partido en servidor */
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

/* Comprueba sesion de editor con validacion en servidor */
export async function isEditorSessionActiveAsync() {
  if (!getEditorSession()) return false
  return validateEditorSession()
}
