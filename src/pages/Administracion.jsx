import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import LandingAdmin from './LandingAdmin'
import PadronImport from './PadronImport'
import AdminSecurity from './AdminSecurity'
import './AdminHub.css'

const BASE = '/administracion'

const TABS = [
  { id: 'informacion-publica', label: 'Información pública' },
  { id: 'padron', label: 'Padrón electoral' },
  { id: 'seguridad', label: 'Seguridad' },
]

/* Hub de configuración: landing, padrón y roles */
function Administracion() {
  return (
    <section className="admin-hub">
      <header className="admin-hub-header">
        <h1>Administración</h1>
        <p>Gestiona la página pública, el padrón de votantes y los accesos al panel.</p>
      </header>

      <nav className="admin-hub-tabs-wrap" aria-label="Secciones de administración">
        <div className="admin-hub-tabs" role="tablist">
          {TABS.map(({ id, label }) => (
            <NavLink
              key={id}
              to={`${BASE}/${id}`}
              end
              role="tab"
              className={({ isActive }) => `admin-hub-tab${isActive ? ' is-active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="admin-hub-panel">
        <Routes>
          <Route index element={<Navigate to={`${BASE}/informacion-publica`} replace />} />
          <Route path="informacion-publica" element={<LandingAdmin />} />
          <Route path="padron" element={<PadronImport />} />
          <Route path="seguridad" element={<AdminSecurity />} />
          <Route path="*" element={<Navigate to={`${BASE}/informacion-publica`} replace />} />
        </Routes>
      </div>
    </section>
  )
}

export default Administracion
