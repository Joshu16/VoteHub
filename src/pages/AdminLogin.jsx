import { useState } from 'react'
import './AdminLogin.css'
import '../styles/admin-forms.css'
import { EmailOtpLogin } from '../components/EmailOtpLogin'
import {
  cancelAdminLogin,
  completeAdminLogin,
  getPendingAdminEmail,
  isAdminOtpPending,
  requestAdminLoginCode,
} from '../lib/adminAuth'

/* Pagina de login administrativo con OTP por correo */
function AdminLogin() {
  const [loginDone, setLoginDone] = useState(false)

  if (loginDone) {
    return (
      <section className="admin-login-page">
        <div className="admin-login-card admin-login-card--checking">
          <p>Entrando al panel...</p>
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
            setLoginDone(true)
          }}
          onResend={async (email) => {
            await requestAdminLoginCode(email)
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
