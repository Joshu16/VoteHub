import * as XLSX from 'xlsx'

function soloDigitosCedula(v) {
  return String(v ?? '').replace(/\D/g, '')
}

function textoLimpio(v) {
  return String(v ?? '').trim()
}

function columnaValor(pairs, regex, exclude) {
  const match = pairs.find(([k]) => {
    if (exclude?.test(k)) return false
    return regex.test(k)
  })
  return match?.[1]
}

function filaAVotante(row, gradoFallback) {
  const pairs = Object.entries(row).filter(([k]) => !/^__empty/i.test(k))
  if (pairs.length === 0) return null

  const cedulaRaw =
    columnaValor(pairs, /n[uú]mero de identificaci[oó]n/i) ??
    columnaValor(pairs, /c[eé]dula/i, /tipo/i) ??
    columnaValor(pairs, /identificaci[oó]n/i, /tipo/i) ??
    pairs[0]?.[1]

  const cedula = soloDigitosCedula(cedulaRaw)
  if (!cedula) return null

  const nombre = textoLimpio(
    columnaValor(pairs, /^nombre$/i) ?? columnaValor(pairs, /^nombre/i, /apellido/i),
  )
  const primer_apellido = textoLimpio(columnaValor(pairs, /primer apellido/i))
  const segundo_apellido = textoLimpio(columnaValor(pairs, /segundo apellido/i))
  const grado = textoLimpio(columnaValor(pairs, /grado|nivel|curso/i)) || textoLimpio(gradoFallback)
  const especialidad = textoLimpio(columnaValor(pairs, /especialidad/i))

  return { cedula, nombre, primer_apellido, segundo_apellido, grado, especialidad }
}

function dedupePorCedula(lista) {
  const map = new Map()
  for (const item of lista) {
    map.set(item.cedula, item)
  }
  return [...map.values()]
}

function resumenPorGrado(lista) {
  const counts = {}
  for (const item of lista) {
    const grado = item.grado || 'Sin grado'
    counts[grado] = (counts[grado] || 0) + 1
  }
  return counts
}

async function parseWorkbook(buffer, fileName) {
  const libro = XLSX.read(buffer, { type: 'array' })
  const lista = []
  const lowerName = String(fileName || '').toLowerCase()

  if (libro.SheetNames.length === 1 && lowerName.endsWith('.csv')) {
    const hoja = libro.Sheets[libro.SheetNames[0]]
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })
    for (const fila of filas) {
      const v = filaAVotante(fila, '')
      if (v) lista.push(v)
    }
  } else {
    for (const nombreHoja of libro.SheetNames) {
      const hoja = libro.Sheets[nombreHoja]
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })
      for (const fila of filas) {
        const v = filaAVotante(fila, nombreHoja)
        if (v) lista.push(v)
      }
    }
  }

  const deduped = dedupePorCedula(lista)
  return {
    voters: deduped,
    total: deduped.length,
    byGrado: resumenPorGrado(deduped),
  }
}

export async function parseVoterRegistryFile(file) {
  if (!file) {
    throw new Error('Selecciona un archivo.')
  }

  const name = String(file.name || '').toLowerCase()
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('Formato no soportado. Usa .csv o .xlsx.')
  }

  const buffer = await file.arrayBuffer()
  const parsed = await parseWorkbook(buffer, name)

  if (parsed.total === 0) {
    throw new Error('No se encontraron votantes validos en el archivo.')
  }

  return parsed
}

export function voterDisplayName(voter) {
  const partes = [voter?.nombre, voter?.primer_apellido, voter?.segundo_apellido]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
  return partes.join(' ') || 'Estudiante'
}
