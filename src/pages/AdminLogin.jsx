import { useNavigate } from 'react-router-dom'
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

function AdminLogin() {
  const navigate = useNavigate()

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
