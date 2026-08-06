import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Resultados from './pages/Resultados'
import Administracion from './pages/Administracion'
import Voting from './pages/Voting'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import EditorLogin from './pages/EditorLogin'
import PartyEditor from './pages/PartyEditor'
import Home from './pages/Home'
import Landing from './pages/Landing'
import { isAdminSessionActive, signOutAdmin } from './lib/adminAuth'
import { supabase } from './lib/supabaseClient'
import { clearVoterSession, isVoterSessionReady } from './lib/voterSession'
import { isEditorSessionActiveAsync } from './lib/editorSession'
import logoCIT, { applyBrandFavicon } from './lib/brandLogo.js'

/* Ítems menú lateral admin */
const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/resultados', label: 'Resultados' },
  { to: '/administracion', label: 'Administración' },
]

/* Títulos de pestaña por ruta */
const pageTitles = {
  '/': 'VoteHub | Página Principal',
  '/menu': 'VoteHub | Menú',
  '/dashboard': 'VoteHub | Dashboard',
  '/resultados': 'VoteHub | Resultados',
  '/resultados/estadisticas': 'VoteHub | Estadísticas',
  '/resultados/registros': 'VoteHub | Registros',
  '/administracion': 'VoteHub | Administración',
  '/administracion/informacion-publica': 'VoteHub | Información pública',
  '/administracion/padron': 'VoteHub | Padrón electoral',
  '/administracion/seguridad': 'VoteHub | Seguridad',
  '/editor-login': 'VoteHub | Editor de partidos',
  '/editor-partidos': 'VoteHub | Editor de partidos',
  '/votacion': 'VoteHub | Votación',
  '/login': 'VoteHub | Login',
  '/admin-login': 'VoteHub | Login Admin',
}

/* Resuelve titulo de pestaña incluyendo rutas anidadas */
function resolvePageTitle(pathname) {
  return pageTitles[pathname] || 'VoteHub'
}

/* Sincroniza titulo de pestaña e icono con la ruta */
function setPageMetadata(pathname) {
  document.title = resolvePageTitle(pathname)
  applyBrandFavicon()
}

/* Barra lateral admin */
function Navigation() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  /* Cierra menu movil al cambiar de ruta */
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  /* Bloquea scroll y escucha Escape con menu abierto */
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    closeMenu()
    await signOutAdmin()
    window.location.assign('/admin-login')
  }

  return (
    <>
      <header className="admin-mobile-header">
        <img src={logoCIT} alt="Complejo Educativo CIT" className="admin-mobile-header-logo" />
        <span className="admin-mobile-header-title">VoteHub Admin</span>
        <button
          type="button"
          className={`admin-menu-toggle${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="admin-side-nav"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="admin-menu-toggle-bar" aria-hidden />
          <span className="admin-menu-toggle-bar" aria-hidden />
          <span className="admin-menu-toggle-bar" aria-hidden />
        </button>
      </header>
      <button
        type="button"
        className={`admin-nav-backdrop${menuOpen ? ' is-open' : ''}`}
        aria-label="Cerrar menú"
        onClick={closeMenu}
        tabIndex={menuOpen ? 0 : -1}
      />
      <nav id="admin-side-nav" className={`side-nav${menuOpen ? ' is-open' : ''}`}>
        <div className="side-nav-links">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
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
          <NavLink to="/menu" className="nav-btn" onClick={closeMenu}>
            Volver al menú
          </NavLink>
          <button type="button" className="nav-btn nav-btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  )
}

/* Raiz layout y rutas */
function App() {
  const location = useLocation()
  const prevPath = useRef('')
  const [isAdminLogged, setIsAdminLogged] = useState(false)
  const [isEditorLogged, setIsEditorLogged] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const showSidebar =
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/resultados') ||
    location.pathname.startsWith('/administracion')

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

  /* Comprueba sesion admin y escucha cambios del token de Supabase */
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const [adminActive, editorActive] = await Promise.all([
        isAdminSessionActive(),
        isEditorSessionActiveAsync(),
      ])
      if (!isMounted) return
      setIsAdminLogged(adminActive)
      setIsEditorLogged(editorActive)
      setIsCheckingSession(false)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [location.pathname])

  /* Cierra sesion admin tras 7 dias aunque no cambie la ruta */
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

  /* Cierra sesion editor tras expiracion aunque no cambie la ruta */
  useEffect(() => {
    if (!isEditorLogged) {
      return undefined
    }

    const id = setInterval(async () => {
      const active = await isEditorSessionActiveAsync()
      if (!active) {
        setIsEditorLogged(false)
      }
    }, 60_000)

    return () => clearInterval(id)
  }, [isEditorLogged])

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
              path="/resultados/*"
              element={isAdminLogged ? <Resultados /> : <Navigate to="/admin-login" replace />}
            />
            <Route
              path="/administracion/*"
              element={isAdminLogged ? <Administracion /> : <Navigate to="/admin-login" replace />}
            />
            <Route
              path="/informacion-publica"
              element={
                isAdminLogged ? (
                  <Navigate to="/administracion/informacion-publica" replace />
                ) : (
                  <Navigate to="/admin-login" replace />
                )
              }
            />
            <Route
              path="/estadisticas"
              element={
                isAdminLogged ? (
                  <Navigate to="/resultados/estadisticas" replace />
                ) : (
                  <Navigate to="/admin-login" replace />
                )
              }
            />
            <Route
              path="/registros"
              element={
                isAdminLogged ? (
                  <Navigate to="/resultados/registros" replace />
                ) : (
                  <Navigate to="/admin-login" replace />
                )
              }
            />
            <Route
              path="/padron"
              element={
                isAdminLogged ? (
                  <Navigate to="/administracion/padron" replace />
                ) : (
                  <Navigate to="/admin-login" replace />
                )
              }
            />
            <Route
              path="/seguridad"
              element={
                isAdminLogged ? (
                  <Navigate to="/administracion/seguridad" replace />
                ) : (
                  <Navigate to="/admin-login" replace />
                )
              }
            />
            <Route
              path="/editor-login"
              element={isEditorLogged ? <Navigate to="/editor-partidos" replace /> : <EditorLogin />}
            />
            <Route
              path="/editor-partidos"
              element={isEditorLogged ? <PartyEditor /> : <Navigate to="/editor-login" replace />}
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