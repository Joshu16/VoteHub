import { supabase } from './supabaseClient'

/* Contenido por defecto de la landing publica */
export const DEFAULT_LANDING = {
  hero_title: 'Elecciones Estudiantiles CIT',
  hero_subtitle:
    'Conoce el proceso electoral del Complejo Educativo CIT: la mesa en funciones, las fechas clave y la información que necesitas antes de votar.',
  hero_cta_label: 'Ir a votar',
  current_party_name: 'Luma',
  current_party_description:
    'Luma lidera la mesa directiva del estudiantado en el período actual. Su enfoque combina representación estudiantil, actividades formativas y espacios de participación para todos los niveles del colegio.',
  current_party_image: null,
  current_party_members: [],
  important_dates: [],
  extra_sections: [
    {
      title: 'Quién puede votar',
      content:
        'Pueden participar los estudiantes registrados en el padrón electoral del colegio. La validación se realiza con el número de cédula al ingresar al sistema.',
    },
    {
      title: 'Cómo funciona el voto',
      content:
        'Cada estudiante tiene derecho a un solo voto por período electoral. El sistema registra la participación de forma anónima y muestra los resultados al cierre del proceso.',
    },
    {
      title: 'Transparencia',
      content:
        'Las mesas directivas, fechas y partidos participantes se publican en esta página para que toda la comunidad educativa tenga acceso a la misma información.',
    },
    {
      title: 'Complejo Educativo CIT',
      content:
        'VoteHub es la plataforma oficial de elecciones estudiantiles del CIT. Si tienes dudas sobre el proceso, consulta con tu docente orientador o la coordinación estudiantil.',
    },
  ],
}

/* Parsea campo JSON a lista con fallback */
function parseJsonList(raw, fallback = []) {
  if (raw == null || raw === '') return fallback
  if (Array.isArray(raw)) return raw
  try {
    const data = JSON.parse(String(raw))
    return Array.isArray(data) ? data : fallback
  } catch {
    return fallback
  }
}

/* Usa fallback si el valor esta vacio o es nulo */
function withDefault(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  return value
}

/* Normaliza fila de Supabase al formato de la landing */
function normalizeRow(row) {
  if (!row) return { ...DEFAULT_LANDING }
  return {
    hero_title: withDefault(row.hero_title, DEFAULT_LANDING.hero_title),
    hero_subtitle: withDefault(row.hero_subtitle, DEFAULT_LANDING.hero_subtitle),
    hero_cta_label: withDefault(row.hero_cta_label, DEFAULT_LANDING.hero_cta_label),
    current_party_name: withDefault(row.current_party_name, DEFAULT_LANDING.current_party_name),
    current_party_description: withDefault(
      row.current_party_description,
      DEFAULT_LANDING.current_party_description,
    ),
    current_party_image: row.current_party_image ?? DEFAULT_LANDING.current_party_image,
    current_party_members: parseJsonList(row.current_party_members, []),
    important_dates: parseJsonList(row.important_dates, []),
    extra_sections: withDefault(
      parseJsonList(row.extra_sections),
      DEFAULT_LANDING.extra_sections,
    ),
  }
}

/* Prepara payload para upsert en Supabase */
function serializePayload(content) {
  return {
    id: 1,
    hero_title: String(content.hero_title || '').trim() || DEFAULT_LANDING.hero_title,
    hero_subtitle: String(content.hero_subtitle || '').trim() || DEFAULT_LANDING.hero_subtitle,
    hero_cta_label: String(content.hero_cta_label || '').trim() || DEFAULT_LANDING.hero_cta_label,
    current_party_name: String(content.current_party_name || '').trim(),
    current_party_description: String(content.current_party_description || '').trim(),
    current_party_image: content.current_party_image || null,
    current_party_members: JSON.stringify(content.current_party_members || []),
    important_dates: JSON.stringify(content.important_dates || []),
    extra_sections: JSON.stringify(content.extra_sections || []),
    updated_at: new Date().toISOString(),
  }
}

/* Detecta si falta la tabla landing_content */
function tablaNoExiste(err) {
  const code = String(err?.code || '')
  const texto = `${err?.message || ''} ${err?.details || ''}`.toLowerCase()
  return code === '42P01' || texto.includes('landing_content')
}

/* Lee contenido de la landing desde Supabase */
export async function getLandingContent() {
  const res = await supabase.from('landing_content').select('*').eq('id', 1).maybeSingle()
  if (res.error) {
    if (tablaNoExiste(res.error)) {
      return { ...DEFAULT_LANDING, tableMissing: true }
    }
    throw res.error
  }
  return normalizeRow(res.data)
}

/* Guarda contenido de la landing en Supabase */
export async function saveLandingContent(content) {
  const payload = serializePayload(content)
  const res = await supabase.from('landing_content').upsert(payload).select('*').single()
  if (res.error) {
    if (tablaNoExiste(res.error)) {
      return { ok: false, tableMissing: true }
    }
    throw res.error
  }
  return { ok: true, data: normalizeRow(res.data) }
}
