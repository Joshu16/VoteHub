import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Estadisticas from './pages/Estadisticas'
import Registros from './pages/Registros'
import Voting from './pages/Voting'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import { isAdminSessionActive } from './lib/adminAuth'

/* Navegación lateral */
/* Sidebar admin */
const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/estadisticas', label: 'Estadísticas' },
  { to: '/registros', label: 'Registros' },
]

/* Título por página */
const pageTitles = {
  '/': 'VoteHub | Inicio',
  '/dashboard': 'VoteHub | Dashboard',
  '/estadisticas': 'VoteHub | Estadísticas',
  '/registros': 'VoteHub | Registros',
  '/votacion': 'VoteHub | Votación',
  '/login': 'VoteHub | Login',
  '/admin-login': 'VoteHub | Login Admin',
}

/* Icono por página */
const pageIcons = {
  '/': '/icons.svg',
  '/dashboard': '/icons.svg',
  '/estadisticas': '/icons.svg',
  '/registros': '/icons.svg',
  '/votacion': '/icons.svg',
  '/login': '/icons.svg',
  '/admin-login': '/icons.svg',
}

/* Poner metadata */
function setPageMetadata(pathname) {
  /* Título de pestaña */
  document.title = pageTitles[pathname] || 'VoteHub'

  /* Ícono por ruta */
  const iconHref = pageIcons[pathname] || '/icons.svg'
  let iconLink = document.querySelector("link[rel='icon']")
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.setAttribute('rel', 'icon')
    document.head.appendChild(iconLink)
  }
  iconLink.setAttribute('href', iconHref)
  iconLink.setAttribute('type', 'image/svg+xml')
}

/* Barra lateral */
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

/* Menú de inicio */
function HomeMenu() {
  return (
    <section>
      <h1>Menú principal</h1>
      <p>Selecciona una sección para continuar.</p>
      <ul>
        <li>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </li>
        <li>
          <NavLink to="/estadisticas">Estadísticas</NavLink>
        </li>
        <li>
          <NavLink to="/registros">Registros</NavLink>
        </li>
        <li>
          <NavLink to="/votacion">Votación</NavLink>
        </li>
        <li>
          <NavLink to="/login">Login</NavLink>
        </li>
        <li>
          <NavLink to="/admin-login">Login Administrativo</NavLink>
        </li>
      </ul>
    </section>
  )
}

/* App principal y rutas */
function App() {
  const location = useLocation()
  const [isAdminLogged, setIsAdminLogged] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  /* Mostrar sidebar solo en panel admin */
  const showSidebar =
    location.pathname === '/dashboard' ||
    location.pathname === '/estadisticas' ||
    location.pathname === '/registros'

  /* Cambiar metadata según la ruta */
  useEffect(() => {
    setPageMetadata(location.pathname)
  }, [location.pathname])

  /* Revisar sesión admin al cambiar de ruta */
  useEffect(() => {
    const checkSession = async () => {
      const active = await isAdminSessionActive()
      setIsAdminLogged(active)
      setIsCheckingSession(false)
    }

    checkSession()
  }, [location.pathname])

  /* Pantalla de carga mientras valida sesión */
  if (isCheckingSession) {
    return <main className="app-shell">Cargando...</main>
  }

  /* Layout con rutas protegidas */
  return (
    <main className="app-shell">
      {showSidebar && <Navigation />}

      <section className={`page-container ${showSidebar ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeMenu />} />
          <Route
            path="/dashboard"
            element={isAdminLogged ? <Dashboard /> : <Navigate to="/admin-login" replace />}
          />
          <Route
            path="/estadisticas"
            element={isAdminLogged ? <Estadisticas /> : <Navigate to="/admin-login" replace />}
          />
          <Route
            path="/registros"
            element={isAdminLogged ? <Registros /> : <Navigate to="/admin-login" replace />}
          />
          <Route path="/votacion" element={<Voting />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin-login"
            element={isAdminLogged ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </section>
    </main>
  )
}

export default App