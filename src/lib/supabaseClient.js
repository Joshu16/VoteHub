import { createClient } from '@supabase/supabase-js'

/* Cliente con reglas de seguridad del proyecto */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Faltan variables de entorno de Supabase.')
}

export const supabase = createClient(url, key)
