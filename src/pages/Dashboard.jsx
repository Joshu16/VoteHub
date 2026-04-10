import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const partidos = [
  { nombre: 'Partido 1', votos: 100 },
  { nombre: 'Partido 2', votos: 100 },
  { nombre: 'Partido 3', votos: 100 },
  { nombre: 'Partido 4', votos: 100 },
]

function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('isAdminLogged')
    navigate('/admin-login')
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>Centro de Control</h1>
        <p>Hola, Administrador/a</p>
      </header>

      <div className="action-row">
        <button type="button">Iniciar Elecciones</button>
        <button type="button">Terminar Elecciones</button>
        <button type="button">Anadir Partido</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Votos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {partidos.map((partido) => (
              <tr key={partido.nombre}>
                <td>{partido.nombre}</td>
                <td>{partido.votos}</td>
                <td>
                  <button type="button" className="icon-btn">
                    Editar
                  </button>
                  <button type="button" className="icon-btn danger">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bottom-actions">
        <button type="button">Exportar Datos</button>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Cerrar sesion
        </button>
      </div>
    </section>
  )
}

export default Dashboard
