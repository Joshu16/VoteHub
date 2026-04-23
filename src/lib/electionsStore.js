import { supabase } from './supabaseClient'

/* Cuando la BD todavía no tiene image_url */
function isImageColumnError(error) {
  const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return text.includes('image_url')
}

/* Buscar elección por año */
async function getElectionByYear(year) {
  const { data, error } = await supabase
    .from('elections')
    .select('id, year, is_active')
    .eq('year', year)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/* Traer partidos de una elección */
async function getPartiesByElectionId(electionId) {
  const withImage = await supabase
    .from('parties')
    .select('id, name, votes, image_url, election_id')
    .eq('election_id', electionId)
    .order('name', { ascending: true })

  if (!withImage.error) {
    return withImage.data || []
  }

  if (!isImageColumnError(withImage.error)) {
    throw withImage.error
  }

  const withoutImage = await supabase
    .from('parties')
    .select('id, name, votes, election_id')
    .eq('election_id', electionId)
    .order('name', { ascending: true })
  if (withoutImage.error) {
    throw withoutImage.error
  }

  return (withoutImage.data || []).map((party) => ({ ...party, image_url: null }))
}

/* Crear elección si no existe */
export async function ensureElection(year) {
  const existing = await getElectionByYear(year)
  if (existing) {
    const parties = await getPartiesByElectionId(existing.id)
    return { ...existing, isActive: existing.is_active, parties }
  }

  const { data, error } = await supabase
    .from('elections')
    .insert({ year, is_active: false })
    .select('id, year, is_active')
    .single()

  if (error) {
    throw error
  }

  return { ...data, isActive: data.is_active, parties: [] }
}

/* Activar elección del año y desactivar las demás */
export async function startElection(year) {
  const election = await ensureElection(year)

  const { error: clearError } = await supabase
    .from('elections')
    .update({ is_active: false })
    .neq('id', election.id)
  if (clearError) {
    throw clearError
  }

  const { error } = await supabase.from('elections').update({ is_active: true }).eq('id', election.id)
  if (error) {
    throw error
  }
}

/* Detener elección del año */
export async function stopElection(year) {
  const election = await getElectionByYear(year)
  if (!election) {
    return
  }

  const { error } = await supabase.from('elections').update({ is_active: false }).eq('id', election.id)
  if (error) {
    throw error
  }
}

/* Agregar partido */
export async function addParty(year, name, imageUrl) {
  const election = await ensureElection(year)
  const normalizedName = name.trim()

  if (!normalizedName) {
    return false
  }

  const parties = await getPartiesByElectionId(election.id)
  const duplicate = parties.some(
    (party) => party.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (duplicate) {
    return false
  }

  const withImage = await supabase
    .from('parties')
    .insert({
      election_id: election.id,
      name: normalizedName,
      votes: 0,
      image_url: imageUrl || null,
    })
  if (!withImage.error) {
    return true
  }

  if (!isImageColumnError(withImage.error)) {
    throw withImage.error
  }

  const withoutImage = await supabase
    .from('parties')
    .insert({ election_id: election.id, name: normalizedName, votes: 0 })
  if (withoutImage.error) {
    throw withoutImage.error
  }

  return true
}

/* Editar partido */
export async function editParty(year, partyId, nextName, imageUrl) {
  const election = await ensureElection(year)
  const normalizedName = nextName.trim()

  if (!normalizedName) {
    return false
  }

  const parties = await getPartiesByElectionId(election.id)
  const duplicate = parties.some(
    (party) => party.id !== partyId && party.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (duplicate) {
    return false
  }

  const withImage = await supabase
    .from('parties')
    .update({ name: normalizedName, image_url: imageUrl || null })
    .eq('id', partyId)
    .eq('election_id', election.id)
  if (!withImage.error) {
    return true
  }

  if (!isImageColumnError(withImage.error)) {
    throw withImage.error
  }

  const withoutImage = await supabase
    .from('parties')
    .update({ name: normalizedName })
    .eq('id', partyId)
    .eq('election_id', election.id)
  if (withoutImage.error) {
    throw withoutImage.error
  }

  return true
}

/* Eliminar partido y sus votos */
export async function removeParty(year, partyId) {
  const election = await ensureElection(year)
  const { error: votesError } = await supabase
    .from('votes')
    .delete()
    .eq('election_id', election.id)
    .eq('party_id', partyId)
  if (votesError) {
    throw votesError
  }

  const { error } = await supabase
    .from('parties')
    .delete()
    .eq('id', partyId)
    .eq('election_id', election.id)
  if (error) {
    throw error
  }
}

/* Traer elección activa */
export async function getActiveElection() {
  const { data, error } = await supabase
    .from('elections')
    .select('id, year, is_active')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    throw error
  }
  if (!data) {
    return null
  }

  const parties = await getPartiesByElectionId(data.id)
  return { ...data, isActive: data.is_active, parties }
}

/* Traer historial de elecciones */
export async function getAllElections() {
  const { data: elections, error } = await supabase
    .from('elections')
    .select('id, year, is_active')
    .order('year', { ascending: false })
  if (error) {
    throw error
  }

  const result = elections || []
  if (!result.length) {
    return []
  }

  const ids = result.map((item) => item.id)
  const withImage = await supabase
    .from('parties')
    .select('id, election_id, name, votes, image_url')
    .in('election_id', ids)
    .order('name', { ascending: true })
  if (!withImage.error) {
    return result.map((election) => ({
      ...election,
      isActive: election.is_active,
      parties: (withImage.data || []).filter((party) => party.election_id === election.id),
    }))
  }

  if (!isImageColumnError(withImage.error)) {
    throw withImage.error
  }

  const withoutImage = await supabase
    .from('parties')
    .select('id, election_id, name, votes')
    .in('election_id', ids)
    .order('name', { ascending: true })
  if (withoutImage.error) {
    throw withoutImage.error
  }

  return result.map((election) => ({
    ...election,
    isActive: election.is_active,
    parties: (withoutImage.data || [])
      .filter((party) => party.election_id === election.id)
      .map((party) => ({ ...party, image_url: null })),
  }))
}

/* Borrar una elección completa */
export async function deleteElectionByYear(year) {
  const election = await getElectionByYear(year)
  if (!election) {
    return
  }

  const { error: votesError } = await supabase.from('votes').delete().eq('election_id', election.id)
  if (votesError) {
    throw votesError
  }

  const { error: partiesError } = await supabase.from('parties').delete().eq('election_id', election.id)
  if (partiesError) {
    throw partiesError
  }

  const { error } = await supabase.from('elections').delete().eq('id', election.id)
  if (error) {
    throw error
  }
}

/* Registrar voto */
export async function voteParty(year, partyId, voterCedula) {
  const election = await getElectionByYear(year)
  if (!election || !election.is_active) {
    return { ok: false, reason: 'NO_ACTIVE' }
  }

  const { error: voteError } = await supabase.from('votes').insert({
    election_id: election.id,
    party_id: partyId,
    voter_cedula: voterCedula,
  })
  if (voteError) {
    if (voteError.code === '23505') {
      return { ok: false, reason: 'ALREADY_VOTED' }
    }
    throw voteError
  }

  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('votes')
    .eq('id', partyId)
    .eq('election_id', election.id)
    .single()
  if (partyError) {
    throw partyError
  }

  const { error: updateError } = await supabase
    .from('parties')
    .update({ votes: Number(party.votes || 0) + 1 })
    .eq('id', partyId)
    .eq('election_id', election.id)
  if (updateError) {
    throw updateError
  }

  return { ok: true }
}

/* Revisar si una cédula ya votó */
export async function hasVotedInElection(year, voterCedula) {
  const election = await getElectionByYear(year)
  if (!election) {
    return false
  }

  const { data, error } = await supabase
    .from('votes')
    .select('id')
    .eq('election_id', election.id)
    .eq('voter_cedula', voterCedula)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}
