import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'
import '../styles/admin-forms.css'
import { EmailOtpLogin } from '../components/EmailOtpLogin'
import {
  cancelAdminLogin,
  completeAdminLogin,
  getPendingAdminEmail,
  isAdminOtpPending,
  isAdminSessionActive,
  requestAdminLoginCode,
} from '../lib/adminAuth'

/* Pagina de login administrativo con OTP por correo */
function AdminLogin() {
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)

  /* Redirige al dashboard si ya hay sesion activa */
  useEffect(() => {
    let isMounted = true

    isAdminSessionActive().then((active) => {
      if (!isMounted) return
      if (active) {
        navigate('/dashboard', { replace: true })
        return
      }
      setCheckingSession(false)
    })

    return () => {
      isMounted = false
    }
  }, [navigate])

  if (checkingSession) {
    return (
      <section className="admin-login-page">
        <div className="admin-login-card admin-login-card--checking">
          <p>Verificando sesión...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <EmailOtpLogin
          title="Acceso administrativo"
          subtitle="Ingresa tu correo autorizado. Te enviaremos un código de verificación."
          checkEmail={async (email) => {
            await requestAdminLoginCode(email)
          }}
          onCodeSent={async () => {}}
          onVerify={async (email, code) => {
            await completeAdminLogin(email, code)
            navigate('/dashboard')
          }}
          pendingEmail={getPendingAdminEmail()}
          isPending={isAdminOtpPending()}
          onCancel={cancelAdminLogin}
        />
      </div>
    </section>
  )
}

export default AdminLogin
