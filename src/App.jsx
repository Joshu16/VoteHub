import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Estadisticas from './pages/Estadisticas'
import Registros from './pages/Registros'
import Voting from './pages/Voting'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Home from './pages/Home'
import Landing from './pages/Landing'
import LandingAdmin from './pages/LandingAdmin'
import { isAdminSessionActive, signOutAdmin } from './lib/adminAuth'
import { clearVoterSession, isVoterSessionReady } from './lib/voterSession'
import logoCIT, { applyBrandFavicon } from './lib/brandLogo.js'

/* Ítems menú lateral admin */
const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/informacion-publica', label: 'Información pública' },
  { to: '/estadisticas', label: 'Estadísticas' },
  { to: '/registros', label: 'Registros' },
]

/* Títulos de pestaña por ruta */
const pageTitles = {
  '/': 'VoteHub | Página Principal',
  '/menu': 'VoteHub | Menú',
  '/dashboard': 'VoteHub | Dashboard',
  '/informacion-publica': 'VoteHub | Información pública',
  '/estadisticas': 'VoteHub | Estadísticas',
  '/registros': 'VoteHub | Registros',
  '/votacion': 'VoteHub | Votación',
  '/login': 'VoteHub | Login',
  '/admin-login': 'VoteHub | Login Admin',
}

/* Sincroniza titulo de pestaña e icono con la ruta */
function setPageMetadata(pathname) {
  document.title = pageTitles[pathname] || 'VoteHub'
  applyBrandFavicon()
}

/* Barra lateral admin */
function Navigation() {
  const handleLogout = async () => {
    await signOutAdmin()
    window.location.assign('/admin-login')
  }

  return (
    <nav className="side-nav">
      <div className="side-nav-links">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="side-nav-spacer" aria-hidden />
      <div className="side-nav-logo-wrap">
        <img src={logoCIT} alt="Complejo Educativo CIT" className="side-nav-logo" />
      </div>
      <div className="side-nav-actions">
        <NavLink to="/menu" className="nav-btn">
          Volver al menú
        </NavLink>
        <button type="button" className="nav-btn nav-btn-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}

/* Raiz layout y rutas */
function App() {
  const location = useLocation()
  const prevPath = useRef('')
  const [isAdminLogged, setIsAdminLogged] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  /* Sidebar solo en rutas admin */
  const showSidebar =
    location.pathname === '/dashboard' ||
    location.pathname === '/informacion-publica' ||
    location.pathname === '/estadisticas' ||
    location.pathname === '/registros'

  /* Metadatos al cambiar ruta */
  useEffect(() => {
    setPageMetadata(location.pathname)
  }, [location.pathname])

/* Cierra sesion votante al salir de votacion */
  useEffect(() => {
    const prev = prevPath.current
    if (prev === '/votacion' && location.pathname !== '/votacion') {
      clearVoterSession()
    }
    prevPath.current = location.pathname
  }, [location.pathname])

  /* Comprueba sesión admin */
  useEffect(() => {
    const checkSession = async () => {
      const active = await isAdminSessionActive()
      setIsAdminLogged(active)
      setIsCheckingSession(false)
    }

    checkSession()
  }, [location.pathname])

  /* Cierra sesion admin tras 24 h aunque no cambie la ruta */
  useEffect(() => {
    if (!isAdminLogged) {
      return undefined
    }

    const id = setInterval(async () => {
      const active = await isAdminSessionActive()
      if (!active) {
        setIsAdminLogged(false)
      }
    }, 60_000)

    return () => clearInterval(id)
  }, [isAdminLogged])

  /* Espera validación de sesión */
  if (isCheckingSession) {
    return <main className="app-shell">Cargando...</main>
  }

  /* Marco visual y rutas */
  return (
    <main className="app-shell">
      {showSidebar && <Navigation />}

      <section className={`page-container ${showSidebar ? 'with-sidebar' : ''}`}>
        <div className="route-stage" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/menu" element={<Home />} />
            <Route path="/informacion" element={<Navigate to="/" replace />} />
            {/* Rutas de panel con sesion admin */}
            <Route
              path="/dashboard"
              element={isAdminLogged ? <Dashboard /> : <Navigate to="/admin-login" replace />}
            />
            <Route
              path="/informacion-publica"
              element={isAdminLogged ? <LandingAdmin /> : <Navigate to="/admin-login" replace />}
            />
            <Route
              path="/estadisticas"
              element={isAdminLogged ? <Estadisticas /> : <Navigate to="/admin-login" replace />}
            />
            <Route
              path="/registros"
              element={isAdminLogged ? <Registros /> : <Navigate to="/admin-login" replace />}
            />
            {/* Votacion solo con sesion de votante */}
            <Route
              path="/votacion"
              element={
                isVoterSessionReady() ? <Voting /> : <Navigate to="/login" replace />
              }
            />
            <Route path="/login" element={<Login />} />
            {/* Si admin ya entro manda al panel */}
            <Route
              path="/admin-login"
              element={isAdminLogged ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </section>
    </main>
  )
}

export default App