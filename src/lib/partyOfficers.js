/* Cargos de mesa directiva del partido (JSON en columna officers_json) */

export const EMPTY_PARTY_OFFICERS = {
  presidente: '',
  vicepresidente: '',
  tesorero: '',
  fiscal: '',
  secretario: '',
  fiscal1: '',
  fiscal2: '',
}

export const PARTY_OFFICER_FIELDS = [
  { key: 'presidente', label: 'Presidente', placeholder: 'Nombre del presidente', required: true },
  { key: 'vicepresidente', label: 'Vicepresidente', placeholder: 'Nombre del vicepresidente' },
  { key: 'tesorero', label: 'Tesorero', placeholder: 'Nombre del tesorero' },
  { key: 'fiscal', label: 'Fiscal', placeholder: 'Nombre del fiscal' },
  { key: 'secretario', label: 'Secretario', placeholder: 'Nombre del secretario' },
  { key: 'fiscal1', label: 'Fiscal 1', placeholder: 'Nombre del fiscal 1' },
  { key: 'fiscal2', label: 'Fiscal 2', placeholder: 'Nombre del fiscal 2' },
]

export function parsePartyOfficers(raw) {
  if (raw == null) {
    return { ...EMPTY_PARTY_OFFICERS }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...EMPTY_PARTY_OFFICERS, ...raw }
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) {
      return { ...EMPTY_PARTY_OFFICERS }
    }
    try {
      const data = JSON.parse(s)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { ...EMPTY_PARTY_OFFICERS, ...data }
      }
    } catch {
      return { ...EMPTY_PARTY_OFFICERS }
    }
  }
  return { ...EMPTY_PARTY_OFFICERS }
}

export function serializePartyOfficers(officers) {
  const trimmed = {
    presidente: (officers.presidente || '').trim(),
    vicepresidente: (officers.vicepresidente || '').trim(),
    tesorero: (officers.tesorero || '').trim(),
    fiscal: (officers.fiscal || '').trim(),
    secretario: (officers.secretario || '').trim(),
    fiscal1: (officers.fiscal1 || '').trim(),
    fiscal2: (officers.fiscal2 || '').trim(),
  }
  if (Object.values(trimmed).every((v) => !v)) {
    return null
  }
  return JSON.stringify(trimmed)
}

export function getPresidenteNombre(officersJson) {
  const o = parsePartyOfficers(officersJson)
  const n = (o.presidente || '').trim()
  return n || null
}
