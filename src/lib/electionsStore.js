import { supabase } from './supabaseClient'

/* Operaciones en servidor elecciones partidos votos */

let activeElectionCache = null
let activeElectionLoaded = false
let activeElectionInflight = null

export function invalidateActiveElectionCache() {
  activeElectionCache = null
  activeElectionLoaded = false
  activeElectionInflight = null
}

/* Error si falta columna en partidos (mensaje de Postgres/Supabase) */
function noHayColumna(err, columnName) {
  const texto = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase()
  return texto.includes(String(columnName).toLowerCase())
}

function noHayColumnaImagen(err) {
  return noHayColumna(err, 'image_url')
}

function esClaveDuplicada(err) {
  return String(err?.code || '') === '23505'
}

function esVotoNuloNombre(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

function noHayColumnaOficiales(err) {
  if (noHayColumna(err, 'officers_json')) {
    return true
  }
  const code = String(err?.code || '')
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  if (code === 'PGRST204' && texto.includes('officers_json')) {
    return true
  }
  return false
}

/* Busca eleccion por año */
async function buscarEleccionPorAño(year) {
  const res = await supabase.from('elections').select('id, year, is_active').eq('year', year).maybeSingle()
  if (res.error) throw res.error
  return res.data
}

function normalizarFilaPartido(p) {
  return {
    ...p,
    image_url: p.image_url ?? null,
    officers_json: p.officers_json ?? null,
  }
}

/* Lista partidos: prueba combinaciones de columnas opcionales por si el esquema es antiguo */
async function listarPartidosDeEleccion(electionId) {
  const selects = [
    'id, name, votes, image_url, officers_json, election_id',
    'id, name, votes, image_url, election_id',
    'id, name, votes, officers_json, election_id',
    'id, name, votes, election_id',
  ]
  let lastErr = null
  for (const sel of selects) {
    const res = await supabase.from('parties').select(sel).eq('election_id', electionId).order('name', { ascending: true })
    if (!res.error) {
      return (res.data || []).map(normalizarFilaPartido)
    }
    lastErr = res.error
  }
  throw lastErr
}

/* Igual para varias elecciones a la vez */
async function listarPartidosVariasElecciones(ids) {
  if (ids.length === 0) {
    return []
  }
  const selects = [
    'id, election_id, name, votes, image_url, officers_json',
    'id, election_id, name, votes, image_url',
    'id, election_id, name, votes, officers_json',
    'id, election_id, name, votes',
  ]
  let lastErr = null
  for (const sel of selects) {
    const res = await supabase.from('parties').select(sel).in('election_id', ids).order('name', { ascending: true })
    if (!res.error) {
      return (res.data || []).map(normalizarFilaPartido)
    }
    lastErr = res.error
  }
  throw lastErr
}

/* Insertar partido reintentando sin columnas opcionales si no existen */
async function agregarFilaPartido(electionId, nombre, votos, urlImagen, officersJson) {
  const base = { election_id: electionId, name: nombre, votes: votos }
  let useImage = true
  let useOfficers = true
  const wantedOfficers = officersJson != null && officersJson !== ''

  for (let i = 0; i < 8; i += 1) {
    const row = { ...base }
    if (useImage) row.image_url = urlImagen ?? null
    if (useOfficers) row.officers_json = officersJson ?? null

    const res = await supabase.from('parties').insert(row)
    if (!res.error) {
      const escribioCargos = useOfficers && Object.prototype.hasOwnProperty.call(row, 'officers_json')
      return { officersNotSaved: wantedOfficers && !escribioCargos }
    }
    if (noHayColumnaOficiales(res.error)) {
      useOfficers = false
      continue
    }
    if (noHayColumnaImagen(res.error)) {
      useImage = false
      continue
    }
    throw res.error
  }

  const last = await supabase.from('parties').insert(base)
  if (last.error) throw last.error
  return { officersNotSaved: wantedOfficers }
}

/* Actualizar partido reintentando sin columnas opcionales */
async function actualizarFilaPartido(electionId, partyId, nombre, urlImagen, officersJson) {
  let useImage = true
  let useOfficers = true
  const wantedOfficers = officersJson != null && officersJson !== ''

  for (let i = 0; i < 8; i += 1) {
    const patch = { name: nombre }
    if (useImage) patch.image_url = urlImagen ?? null
    if (useOfficers) patch.officers_json = officersJson ?? null

    const res = await supabase.from('parties').update(patch).eq('id', partyId).eq('election_id', electionId)
    if (!res.error) {
      const escribioCargos = useOfficers && Object.prototype.hasOwnProperty.call(patch, 'officers_json')
      return { officersNotSaved: wantedOfficers && !escribioCargos }
    }
    if (noHayColumnaOficiales(res.error)) {
      useOfficers = false
      continue
    }
    if (noHayColumnaImagen(res.error)) {
      useImage = false
      continue
    }
    throw res.error
  }

  const last = await supabase.from('parties').update({ name: nombre }).eq('id', partyId).eq('election_id', electionId)
  if (last.error) throw last.error
  return { officersNotSaved: wantedOfficers }
}

/* Partido interno voto nulo en pantalla */
async function asegurarVotoNulo(electionId) {
  const lista = await listarPartidosDeEleccion(electionId)
  if (lista.some((p) => esVotoNuloNombre(p.name))) {
    return
  }
  try {
    await agregarFilaPartido(electionId, 'Voto nulo', 0, null, null)
  } catch (err) {
    /* Otra peticion pudo crearlo al mismo tiempo (React Strict Mode, doble carga) */
    if (esClaveDuplicada(err)) {
      return
    }
    throw err
  }
}

/* Asegura año en tabla y partido voto nulo */
export async function ensureElection(year) {
  const ya = await buscarEleccionPorAño(year)
  if (ya) {
    await asegurarVotoNulo(ya.id)
    const parties = await listarPartidosDeEleccion(ya.id)
    return { ...ya, isActive: ya.is_active, parties }
  }

  let res = await supabase.from('elections').insert({ year, is_active: false }).select('id, year, is_active').single()
  if (res.error) {
    if (res.error.code === '23505') {
      const otra = await buscarEleccionPorAño(year)
      if (otra) {
        await asegurarVotoNulo(otra.id)
        const parties = await listarPartidosDeEleccion(otra.id)
        return { ...otra, isActive: otra.is_active, parties }
      }
    }
    throw res.error
  }

  await asegurarVotoNulo(res.data.id)
  const parties = await listarPartidosDeEleccion(res.data.id)
  return { ...res.data, isActive: res.data.is_active, parties }
}

/* Activa un año y apaga el resto */
export async function startElection(year) {
  const election = await ensureElection(year)

  /* Desactiva todas menos la elegida */
  const off = await supabase.from('elections').update({ is_active: false }).neq('id', election.id)
  if (off.error) throw off.error

  const on = await supabase.from('elections').update({ is_active: true }).eq('id', election.id)
  if (on.error) throw on.error
  invalidateActiveElectionCache()
}

/* Desactiva la elección del año */
export async function stopElection(year) {
  const row = await buscarEleccionPorAño(year)
  if (!row) return
  const res = await supabase.from('elections').update({ is_active: false }).eq('id', row.id)
  if (res.error) throw res.error
  invalidateActiveElectionCache()
}

/* Alta partido sin nombre repetido — devuelve { ok, officersNotSaved? } */
export async function addParty(year, name, imageUrl, officersJson) {
  const election = await ensureElection(year)
  const nombre = name.trim()
  if (!nombre) return { ok: false }

  const parties = await listarPartidosDeEleccion(election.id)
  const repetido = parties.some(
    (p) => p.name.trim().toLowerCase() === nombre.toLowerCase(),
  )
  if (repetido) return { ok: false }

  const r = await agregarFilaPartido(election.id, nombre, 0, imageUrl || null, officersJson ?? null)
  invalidateActiveElectionCache()
  return { ok: true, officersNotSaved: r.officersNotSaved }
}

/* Edicion nombre, imagen y cargos — devuelve { ok, officersNotSaved? } */
export async function editParty(year, partyId, nextName, imageUrl, officersJson) {
  const election = await ensureElection(year)
  const nombre = nextName.trim()
  if (!nombre) return { ok: false }

  const parties = await listarPartidosDeEleccion(election.id)
  const repetido = parties.some(
    (p) => p.id !== partyId && p.name.trim().toLowerCase() === nombre.toLowerCase(),
  )
  if (repetido) return { ok: false }

  const r = await actualizarFilaPartido(election.id, partyId, nombre, imageUrl || null, officersJson ?? null)
  invalidateActiveElectionCache()
  return { ok: true, officersNotSaved: r.officersNotSaved }
}

/* Borra votos del partido y la fila party */
export async function removeParty(year, partyId) {
  const election = await ensureElection(year)

  const delVotes = await supabase
    .from('votes')
    .delete()
    .eq('election_id', election.id)
    .eq('party_id', partyId)
  if (delVotes.error) throw delVotes.error

  const delParty = await supabase.from('parties').delete().eq('id', partyId).eq('election_id', election.id)
  if (delParty.error) throw delParty.error
  invalidateActiveElectionCache()
}

async function fetchActiveElectionFromServer() {
  const res = await supabase
    .from('elections')
    .select('id, year, is_active')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (res.error) throw res.error
  if (!res.data) return null

  const parties = await listarPartidosDeEleccion(res.data.id)
  return { ...res.data, isActive: res.data.is_active, parties }
}

/* Eleccion activa en servidor con partidos (cache en memoria) */
export async function getActiveElection(options = {}) {
  const force = options?.force === true
  if (!force && activeElectionLoaded) {
    return activeElectionCache
  }
  if (!force && activeElectionInflight) {
    return activeElectionInflight
  }

  activeElectionInflight = fetchActiveElectionFromServer()
    .then((data) => {
      activeElectionCache = data
      activeElectionLoaded = true
      activeElectionInflight = null
      return data
    })
    .catch((err) => {
      activeElectionInflight = null
      throw err
    })

  return activeElectionInflight
}

/* Historial elecciones con partidos agrupados */
export async function getAllElections() {
  const res = await supabase.from('elections').select('id, year, is_active').order('year', { ascending: false })
  if (res.error) throw res.error

  const filas = res.data || []
  if (filas.length === 0) return []

  const ids = filas.map((e) => e.id)
  const todosPartidos = await listarPartidosVariasElecciones(ids)

  return filas.map((election) => ({
    ...election,
    isActive: election.is_active,
    parties: todosPartidos.filter((p) => p.election_id === election.id),
  }))
}

/* Borrado votos luego partidos luego eleccion */
export async function deleteElectionByYear(year) {
  const row = await buscarEleccionPorAño(year)
  if (!row) return

  const v = await supabase.from('votes').delete().eq('election_id', row.id)
  if (v.error) throw v.error

  const p = await supabase.from('parties').delete().eq('election_id', row.id)
  if (p.error) throw p.error

  const e = await supabase.from('elections').delete().eq('id', row.id)
  if (e.error) throw e.error
  invalidateActiveElectionCache()
}

/* Limpia votos y deja partidos en cero del año */
export async function clearElectionData(year) {
  const row = await buscarEleccionPorAño(year)
  if (!row) return

  const v = await supabase.from('votes').delete().eq('election_id', row.id)
  if (v.error) throw v.error

  const p = await supabase.from('parties').update({ votes: 0 }).eq('election_id', row.id)
  if (p.error) throw p.error
  invalidateActiveElectionCache()
}

/* Un voto por cedula y sube contador del partido */
export async function voteParty(year, partyId, voterCedula) {
  const election = await buscarEleccionPorAño(year)
  if (!election || !election.is_active) {
    return { ok: false, reason: 'NO_ACTIVE' }
  }

  const ins = await supabase.from('votes').insert({
    election_id: election.id,
    party_id: partyId,
    voter_cedula: voterCedula,
  })
  if (ins.error) {
    if (ins.error.code === '23505') {
      return { ok: false, reason: 'ALREADY_VOTED' }
    }
    throw ins.error
  }

  const partyRes = await supabase
    .from('parties')
    .select('votes')
    .eq('id', partyId)
    .eq('election_id', election.id)
    .single()
  if (partyRes.error) throw partyRes.error

  const suma = Number(partyRes.data.votes || 0) + 1
  const up = await supabase.from('parties').update({ votes: suma }).eq('id', partyId).eq('election_id', election.id)
  if (up.error) throw up.error

  invalidateActiveElectionCache()
  return { ok: true }
}

/* Indica si ya voto esta cedula en el año */
export async function hasVotedInElection(year, voterCedula) {
  const election = await buscarEleccionPorAño(year)
  if (!election) return false

  const res = await supabase
    .from('votes')
    .select('id')
    .eq('election_id', election.id)
    .eq('voter_cedula', voterCedula)
    .limit(1)
    .maybeSingle()
  if (res.error) throw res.error
  return Boolean(res.data)
}
