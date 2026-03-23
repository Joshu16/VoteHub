import './Login.css'
import { Link } from 'react-router-dom'

function Login() {
  return (
    <section className="login-page">
      <div className="login-card">
        <h1>VoteHub</h1>
        <p>Acceso administrativo</p>

        <form className="login-form">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" placeholder="admin@votehub.com" />

          <label htmlFor="password">Contrasena</label>
          <input id="password" type="password" placeholder="********" />

          <Link to="/dashboard" className="login-btn">
            Ingresar
          </Link>
        </form>
      </div>
    </section>
  )
}

export default Login
