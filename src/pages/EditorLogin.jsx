import { useNavigate } from 'react-router-dom'
import './EditorLogin.css'
import '../styles/admin-forms.css'
import { EmailOtpLogin } from '../components/EmailOtpLogin'
import {
  completeEditorLogin,
  getEditorAssignment,
  getPendingEditorEmail,
  isEditorOtpPending,
  requestEditorLoginCode,
} from '../lib/partyEditors'
import { clearPendingOtp } from '../lib/emailOtpAuth'

/* Pagina de login para editores de partidos con OTP */
function EditorLogin() {
  const navigate = useNavigate()

  return (
    <section className="editor-login-page">
      <div className="editor-login-card">
        <EmailOtpLogin
          title="Editor de partidos"
          subtitle="Ingresa el correo que te asignó el administrador. Te enviaremos un código de verificación."
          codeSubtitle={`Ingresa el código enviado a tu correo.`}
          checkEmail={async (email) => {
            const assignment = await getEditorAssignment(email)
            if (!assignment?.partyId) {
              throw new Error('Este correo no tiene un partido asignado.')
            }
            await requestEditorLoginCode(email)
          }}
          onCodeSent={async () => {}}
          onVerify={async (email, code) => {
            await completeEditorLogin(email, code)
            navigate('/editor-partidos')
          }}
          pendingEmail={getPendingEditorEmail()}
          isPending={isEditorOtpPending()}
          onCancel={clearPendingOtp}
          onResend={async (email) => {
            await requestEditorLoginCode(email)
          }}
        />
      </div>
    </section>
  )
}

export default EditorLogin
