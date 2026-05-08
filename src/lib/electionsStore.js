import { supabase } from './supabaseClient'

/* Operaciones en servidor elecciones partidos votos */

/* Error si falta columna imagen en partidos */
function noHayColumnaImagen(err) {
  const texto = (err?.message || '') + ' ' + (err?.details || '')
  return texto.toLowerCase().includes('image_url')
}

/* Busca eleccion por año */
async function buscarEleccionPorAño(year) {
  const res = await supabase.from('elections').select('id, year, is_active').eq('year', year).maybeSingle()
  if (res.error) throw res.error
  return res.data
}

/* Lista partidos ordenada reintento sin imagen si falla */
async function listarPartidosDeEleccion(electionId) {
  let res = await supabase
    .from('parties')
    .select('id, name, votes, image_url, election_id')
    .eq('election_id', electionId)
    .order('name', { ascending: true })
  if (!res.error) {
    return res.data || []
  }
  if (!noHayColumnaImagen(res.error)) {
    throw res.error
  }
  res = await supabase
    .from('parties')
    .select('id, name, votes, election_id')
    .eq('election_id', electionId)
    .order('name', { ascending: true })
  if (res.error) throw res.error
  return (res.data || []).map((p) => ({ ...p, image_url: null }))
}

/* Igual para varias elecciones a la vez */
async function listarPartidosVariasElecciones(ids) {
  if (ids.length === 0) {
    return []
  }
  let res = await supabase
    .from('parties')
    .select('id, election_id, name, votes, image_url')
    .in('election_id', ids)
    .order('name', { ascending: true })
  if (!res.error) {
    return res.data || []
  }
  if (!noHayColumnaImagen(res.error)) {
    throw res.error
  }
  res = await supabase
    .from('parties')
    .select('id, election_id, name, votes')
    .in('election_id', ids)
    .order('name', { ascending: true })
  if (res.error) throw res.error
  return (res.data || []).map((p) => ({ ...p, image_url: null }))
}

/* Insertar partido segundo intento sin columna imagen */
async function agregarFilaPartido(electionId, nombre, votos, urlImagen) {
  let res = await supabase.from('parties').insert({
    election_id: electionId,
    name: nombre,
    votes: votos,
    image_url: urlImagen,
  })
  if (!res.error) {
    return
  }
  if (!noHayColumnaImagen(res.error)) {
    throw res.error
  }
  res = await supabase.from('parties').insert({
    election_id: electionId,
    name: nombre,
    votes: votos,
  })
  if (res.error) throw res.error
}

/* Actualizar partido mismo segundo intento */
async function actualizarFilaPartido(electionId, partyId, nombre, urlImagen) {
  let res = await supabase
    .from('parties')
    .update({ name: nombre, image_url: urlImagen })
    .eq('id', partyId)
    .eq('election_id', electionId)
  if (!res.error) {
    return
  }
  if (!noHayColumnaImagen(res.error)) {
    throw res.error
  }
  res = await supabase.from('parties').update({ name: nombre }).eq('id', partyId).eq('election_id', electionId)
  if (res.error) throw res.error
}

/* Partido interno voto nulo en pantalla */
async function asegurarVotoNulo(electionId) {
  const lista = await listarPartidosDeEleccion(electionId)
  const yaEsta = lista.some((p) => p.name.trim().toLowerCase() === 'voto nulo')
  if (yaEsta) {
    return
  }
  await agregarFilaPartido(electionId, 'Voto nulo', 0, null)
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
}

/* Desactiva la elección del año */
export async function stopElection(year) {
  const row = await buscarEleccionPorAño(year)
  if (!row) return
  const res = await supabase.from('elections').update({ is_active: false }).eq('id', row.id)
  if (res.error) throw res.error
}

/* Alta partido sin nombre repetido */
export async function addParty(year, name, imageUrl) {
  const election = await ensureElection(year)
  const nombre = name.trim()
  if (!nombre) return false

  const parties = await listarPartidosDeEleccion(election.id)
  const repetido = parties.some((p) => p.name.toLowerCase() === nombre.toLowerCase())
  if (repetido) return false

  await agregarFilaPartido(election.id, nombre, 0, imageUrl || null)
  return true
}

/* Edicion nombre e imagen */
export async function editParty(year, partyId, nextName, imageUrl) {
  const election = await ensureElection(year)
  const nombre = nextName.trim()
  if (!nombre) return false

  const parties = await listarPartidosDeEleccion(election.id)
  const repetido = parties.some(
    (p) => p.id !== partyId && p.name.toLowerCase() === nombre.toLowerCase(),
  )
  if (repetido) return false

  await actualizarFilaPartido(election.id, partyId, nombre, imageUrl || null)
  return true
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
}

/* Eleccion activa en servidor con partidos */
export async function getActiveElection() {
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
}

/* Limpia votos y deja partidos en cero del año */
export async function clearElectionData(year) {
  const row = await buscarEleccionPorAño(year)
  if (!row) return

  const v = await supabase.from('votes').delete().eq('election_id', row.id)
  if (v.error) throw v.error

  const p = await supabase.from('parties').update({ votes: 0 }).eq('election_id', row.id)
  if (p.error) throw p.error
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
