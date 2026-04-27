import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Estadisticas from './pages/Estadisticas'
import Registros from './pages/Registros'
import Voting from './pages/Voting'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import { isAdminSessionActive } from './lib/adminAuth'
import { PAGE_TRANSITION_COVER_MS, PAGE_TRANSITION_EVENT, navigateWithTransition } from './lib/pageTransition'

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

function TransitionNavLink({ to, className, children }) {
  const navigate = useNavigate()
  return (
    <NavLink
      to={to}
      className={className}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey
        ) {
          return
        }
        event.preventDefault()
        navigateWithTransition(navigate, to)
      }}
    >
      {children}
    </NavLink>
  )
}

/* Barra lateral */
function Navigation() {
  return (
    <nav className="side-nav">
      {navItems.map(({ to, label }) => (
        <TransitionNavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
        >
          {label}
        </TransitionNavLink>
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
          <TransitionNavLink to="/dashboard">Dashboard</TransitionNavLink>
        </li>
        <li>
          <TransitionNavLink to="/estadisticas">Estadísticas</TransitionNavLink>
        </li>
        <li>
          <TransitionNavLink to="/registros">Registros</TransitionNavLink>
        </li>
        <li>
          <TransitionNavLink to="/votacion">Votación</TransitionNavLink>
        </li>
        <li>
          <TransitionNavLink to="/login">Login</TransitionNavLink>
        </li>
        <li>
          <TransitionNavLink to="/admin-login">Login Administrativo</TransitionNavLink>
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
  const [transitionPhase, setTransitionPhase] = useState('idle')
  const [transitionCycle, setTransitionCycle] = useState(0)
  const firstRenderRef = useRef(true)
  const pendingRevealRef = useRef(false)
  const revealTimerRef = useRef(null)
  /* Mostrar sidebar solo en panel admin */
  const showSidebar =
    location.pathname === '/dashboard' ||
    location.pathname === '/estadisticas' ||
    location.pathname === '/registros'

  /* Cambiar metadata según la ruta */
  useEffect(() => {
    setPageMetadata(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    if (!pendingRevealRef.current) {
      return
    }
    setTransitionPhase('reveal')
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current)
    }
    revealTimerRef.current = window.setTimeout(() => {
      setTransitionPhase('idle')
      pendingRevealRef.current = false
      revealTimerRef.current = null
    }, 240)
  }, [location.pathname])

  useEffect(() => {
    const onTransitionStart = () => {
      pendingRevealRef.current = true
      setTransitionCycle((value) => value + 1)
      setTransitionPhase('cover')
    }
    window.addEventListener(PAGE_TRANSITION_EVENT, onTransitionStart)
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current)
      }
      window.removeEventListener(PAGE_TRANSITION_EVENT, onTransitionStart)
    }
  }, [])

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
        <div className="route-stage">
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
        </div>
        <div
          className={`page-transition-overlay ${
            transitionPhase === 'idle' ? '' : 'is-active'
          } phase-${transitionPhase} cycle-${transitionCycle % 2}`}
          aria-hidden="true"
          style={{ '--cover-ms': `${PAGE_TRANSITION_COVER_MS}ms` }}
        />
      </section>
    </main>
  )
}

export default App