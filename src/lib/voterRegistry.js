import { supabase } from './supabaseClient'

/* Valida cedula contra el padron electoral en Supabase */
export async function validateVoterCedula(cedula) {
  const ced = String(cedula ?? '').replace(/\D/g, '')
  if (!ced) return null

  const res = await supabase.rpc('get_voter_by_cedula', { p_cedula: ced })
  if (res.error) throw res.error

  const row = Array.isArray(res.data) ? res.data[0] : res.data
  return row ?? null
}

/* Obtiene el total de votantes en el padron */
export async function getVotersCount() {
  const res = await supabase.rpc('get_voters_registry_stats')
  if (res.error) throw res.error
  return Number(res.data?.total ?? 0)
}

/* Obtiene total y desglose por grado del padron */
export async function getVotersRegistryStats() {
  const res = await supabase.rpc('get_voters_registry_stats')
  if (res.error) throw res.error
  return {
    total: Number(res.data?.total ?? 0),
    byGrado: res.data?.by_grado ?? {},
  }
}

/* Reemplaza el padron completo con una nueva lista de votantes */
export async function replaceVotersRegistry(voters) {
  const payload = voters.map((v) => ({
    cedula: v.cedula,
    nombre: v.nombre || '',
    primer_apellido: v.primer_apellido || '',
    segundo_apellido: v.segundo_apellido || '',
    grado: v.grado || '',
    especialidad: v.especialidad || '',
  }))

  const res = await supabase.rpc('replace_voters_registry', { p_voters: payload })
  if (res.error) throw res.error
  return {
    inserted: Number(res.data?.inserted ?? 0),
  }
}
