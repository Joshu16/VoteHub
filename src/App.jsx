import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Estadisticas from './pages/Estadisticas'
import Voting from './pages/Voting'
import Login from './pages/Login'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/estadisticas', label: 'Estadisticas' },
  { to: '/votacion', label: 'Votacion' },
  { to: '/login', label: 'Login' },
]

function Navigation() {
  return (
    <nav className="side-nav">
      {navItems.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function HomeMenu() {
  return (
    <section>
      <h1>Menu principal</h1>
      <p>Selecciona una seccion para continuar.</p>
      <ul>
        <li>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </li>
        <li>
          <NavLink to="/estadisticas">Estadisticas</NavLink>
        </li>
        <li>
          <NavLink to="/votacion">Votacion</NavLink>
        </li>
        <li>
          <NavLink to="/login">Login</NavLink>
        </li>
      </ul>
    </section>
  )
}

function App() {
  const location = useLocation()
  const showSidebar = location.pathname !== '/'

  return (
    <main className="app-shell">
      {showSidebar && <Navigation />}

      <section className={`page-container ${showSidebar ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeMenu />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/votacion" element={<Voting />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </section>
    </main>
  )
}

export default App
