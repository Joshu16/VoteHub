import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Estadisticas from './Estadisticas'
import Registros from './Registros'
import './AdminHub.css'

const BASE = '/resultados'

const TABS = [
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'registros', label: 'Registros' },
]

/* Hub de estadísticas en vivo e historial electoral */
function Resultados() {
  return (
    <section className="admin-hub">
      <header className="admin-hub-header">
        <h1>Resultados</h1>
        <p>Consulta participación, gráficos por grado e historial de ediciones.</p>
      </header>

      <nav className="admin-hub-tabs-wrap" aria-label="Secciones de resultados">
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
          <Route index element={<Navigate to={`${BASE}/estadisticas`} replace />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="registros" element={<Registros />} />
          <Route path="*" element={<Navigate to={`${BASE}/estadisticas`} replace />} />
        </Routes>
      </div>
    </section>
  )
}

export default Resultados
