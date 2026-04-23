import * as XLSX from 'xlsx'
import excelFileUrl from '../../cedula nombre por niveles 2026.xlsx?url'

/* Estado en memoria */
/* Cache del padrón */
let votersCache = null

/* Normalizar texto */
function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/* Normalizar cédula */
function normalizeCedula(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/* Convertir fila del excel a votante */
function mapRowToVoter(row) {
  const entries = Object.entries(row)
  if (entries.length === 0) {
    return null
  }

  const cedulaEntry =
    entries.find(([key]) => /cedula|c[eé]dula|identificacion|identificación|id/i.test(key)) ??
    entries[0]
  const nombreEntry = entries.find(([key]) => /nombre|name/i.test(key)) ?? entries[1]

  const cedula = normalizeCedula(cedulaEntry?.[1])
  const nombre = normalizeValue(nombreEntry?.[1])

  if (!cedula) {
    return null
  }

  return { cedula, nombre }
}

/* Se llama al excel y se arma la lista */
async function loadVoters() {
  if (votersCache) {
    return votersCache
  }

  const response = await fetch(excelFileUrl)
  if (!response.ok) {
    throw new Error('No se pudo cargar el Excel de cedulas.')
  }

  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' })
  const voters = []

  /* Lectura de todas las hojas */
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    rows.forEach((row) => {
      const voter = mapRowToVoter(row)
      if (voter) {
        voters.push(voter)
      }
    })
  })

  votersCache = voters
  return voters
}

/* Validación vieja nombre + cédula */
export async function validateVoterFromExcel(nombre, cedula) {
  const normalizedNombre = normalizeValue(nombre)
  const normalizedCedula = normalizeCedula(cedula)
  const voters = await loadVoters()

  const voter = voters.find(
    (item) => item.cedula === normalizedCedula && item.nombre === normalizedNombre,
  )

  return voter ?? null
}

/* Validación por cédula */
export async function validateVoterCedulaFromExcel(cedula) {
  const normalizedCedula = normalizeCedula(cedula)
  const voters = await loadVoters()
  const voter = voters.find((item) => item.cedula === normalizedCedula)
  return voter ?? null
}

/* Contar votantes */
export async function getVotersCountFromExcel() {
  const voters = await loadVoters()
  return voters.length
}
