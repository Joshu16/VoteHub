import { supabase } from './supabaseClient'

/* Credenciales admin */
export const ADMIN_EMAIL = 'ctpcit@gmail.com'
const ADMIN_PASSWORD_FALLBACK = '1234'
const LOCAL_ADMIN_SESSION_KEY = 'votehub_admin_session'

/* Login admin */
export async function signInAdmin(email, password) {
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail !== ADMIN_EMAIL) {
    throw new Error('Solo el correo administrador puede ingresar.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (!error) {
    localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, '0')
    return data
  }

  if (password === ADMIN_PASSWORD_FALLBACK) {
    localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, '1')
    return { user: { email: normalizedEmail } }
  }

  throw error
}

/* Verificar sesión admin */
export async function isAdminSessionActive() {
  if (localStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === '1') {
    return true
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return false
  }

  const sessionEmail = data.session?.user?.email?.toLowerCase()
  return Boolean(sessionEmail && sessionEmail === ADMIN_EMAIL)
}

/* Cerrar sesión admin */
export async function signOutAdmin() {
  localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY)
  await supabase.auth.signOut()
}
