import * as XLSX from 'xlsx'
import excelFileUrl from '../../cedula nombre por niveles 2026.xlsx?url'

/* Lista de votantes en memoria una sola vez */
let cache = null

/* Extrae solo digitos de cedula */
function soloDigitosCedula(v) {
  return String(v ?? '').replace(/\D/g, '')
}

/* Normaliza texto para comparacion */
function textoNormalizado(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/* Detecta columnas cedula y nombre por encabezado */
function filaAVotante(row) {
  const pairs = Object.entries(row)
  if (pairs.length === 0) return null

  const cedulaCol =
    pairs.find(([k]) => /cedula|c[eé]dula|identificacion|identificación|id/i.test(k)) ?? pairs[0]
  const nombreCol = pairs.find(([k]) => /nombre|name/i.test(k)) ?? pairs[1]

  const cedula = soloDigitosCedula(cedulaCol?.[1])
  const nombre = textoNormalizado(nombreCol?.[1])
  if (!cedula) return null
  return { cedula, nombre }
}

/* Lee el archivo todas las hojas */
async function cargarTodo() {
  if (cache) return cache

  const resp = await fetch(excelFileUrl)
  if (!resp.ok) {
    throw new Error('No se pudo cargar el Excel de cedulas.')
  }

  const libro = XLSX.read(await resp.arrayBuffer(), { type: 'array' })
  const lista = []

  for (const nombreHoja of libro.SheetNames) {
    const hoja = libro.Sheets[nombreHoja]
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })
    for (const fila of filas) {
      const v = filaAVotante(fila)
      if (v) lista.push(v)
    }
  }

  cache = lista
  return lista
}

/* Valida nombre y cedula contra el Excel embebido */
export async function validateVoterFromExcel(nombre, cedula) {
  const nom = textoNormalizado(nombre)
  const ced = soloDigitosCedula(cedula)
  const lista = await cargarTodo()
  const uno = lista.find((x) => x.cedula === ced && x.nombre === nom)
  return uno ?? null
}

/* Valida solo cedula contra el Excel embebido */
export async function validateVoterCedulaFromExcel(cedula) {
  const ced = soloDigitosCedula(cedula)
  const lista = await cargarTodo()
  const uno = lista.find((x) => x.cedula === ced)
  return uno ?? null
}

/* Cuenta votantes en el Excel embebido */
export async function getVotersCountFromExcel() {
  const lista = await cargarTodo()
  return lista.length
}
