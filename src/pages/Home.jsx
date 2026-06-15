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
            Log In votación
          </Link>
          <Link to="/admin-login" className="home-link home-link--muted">
            Log In Administrativo
          </Link>
          <Link to="/" className="home-link">
            Página Principal
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default Home
