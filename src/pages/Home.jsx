import { Link } from 'react-router-dom'
import './Home.css'
import logoCIT from '../lib/brandLogo.js'

function Home() {
  return (
    <section className="home-page">
      <div className="home-inner">
        <header className="home-header">
          <img
            src={logoCIT}
            alt="Complejo Educativo CIT"
            className="home-logo"
            width={120}
            height={120}
          />
          <p className="home-brand">VoteHub</p>
          <h1 className="home-title">Elecciones estudiantiles</h1>
        </header>

        <nav className="home-nav" aria-label="Acceso">
          <Link to="/login" className="home-link home-link--student">
            Ingreso estudiantil
          </Link>
          <Link to="/admin-login" className="home-link home-link--admin">
            Ingreso administrativo
          </Link>
        </nav>
      </div>
    </section>
  )
}

export default Home
