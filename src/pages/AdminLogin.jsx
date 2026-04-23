import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'
import { ADMIN_EMAIL, signInAdmin } from '../lib/adminAuth'

/* Login administrativo */
function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('1234')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /* Enviar login */
  const handleAdminLogin = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signInAdmin(email, password)
      navigate('/dashboard')
    } catch (authError) {
      setError(authError.message ?? 'No se pudo iniciar sesión.')
    } finally {
      setIsLoading(false)
    }
  }

  /* Tarjeta de acceso */
  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <h1>Ingresar</h1>
        <p>Acceso administrativo con Supabase.</p>

        <form className="admin-login-form" onSubmit={handleAdminLogin}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo"
            autoComplete="email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            required
          />
          <button type="submit" className="admin-login-btn" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {error && <p className="admin-login-error">{error}</p>}
      </div>
    </section>
  )
}

export default AdminLogin
