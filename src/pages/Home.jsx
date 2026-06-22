import { Link } from 'react-router-dom'
import logoCIT from '../lib/brandLogo.js'
import './Home.css'

function Home() {
  return (
    <div className="home-page">
      <div className="home-card">
        <img src={logoCIT} alt="Complejo Educativo CIT" className="home-logo" />
        <h1>VoteHub</h1>
        <p>Sistema de elecciones estudiantiles del Complejo Educativo CIT</p>
        <nav className="home-nav">
          <Link to="/login" className="home-link home-link--primary">
            Ingreso Votación
          </Link>
          <Link to="/admin-login" className="home-link home-link--muted">
            Ingreso Administrativo
          </Link>
          <Link to="/editor-login" className="home-link home-link--muted">
            Ingreso Editores de Partidos
          </Link>
          <Link to="/" className="home-link home-link--muted">
            Página Principal
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default Home
