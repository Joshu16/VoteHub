import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'

function AdminLogin() {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    localStorage.setItem('isAdminLogged', 'true')
    navigate('/dashboard')
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <h1>Ingresar</h1>
        <p>Ingresa con Google para gestionar partidos, resultados y estadisticas.</p>
        <button type="button" className="google-btn" onClick={handleGoogleLogin}>
          <img
            className="google-icon"
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google"
          />
          Continuar con Google
        </button>
      </div>
    </section>
  )
}

export default AdminLogin
