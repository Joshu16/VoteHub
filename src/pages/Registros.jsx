import { useEffect, useState } from 'react'
import './Registros.css'
import { deleteElectionByYear, getAllElections } from '../lib/electionsStore'
import { formatElectionPeriod } from '../lib/electionPeriod'
import { getElectionWinner } from '../lib/electionWinner'

/* Listado histórico de elecciones */
function Registros() {
  const [elections, setElections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  /* Año que esta borrandose en este momento */
  const [deletingYear, setDeletingYear] = useState(null)

  /* Recarga desde servidor */
  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await getAllElections()
      setElections(data)
    } catch {
      window.alert('No se pudieron cargar los registros.')
      setElections([])
    } finally {
      setIsLoading(false)
    }
  }

  /* Carga inicial */
  useEffect(() => {
    setIsLoading(true)
    getAllElections()
      .then((data) => setElections(data))
      .catch(() => {
        window.alert('No se pudieron cargar los registros.')
        setElections([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  /* Borra elección por año */
  const handleDeleteElection = (year) => {
    const shouldDelete = window.confirm(`Eliminar la elección del periodo ${formatElectionPeriod(year)}?`)
    if (!shouldDelete) {
      return
    }

    setDeletingYear(year)
    deleteElectionByYear(year)
      .then(loadData)
      .catch(() => window.alert('No se pudo eliminar la elección.'))
      .finally(() => setDeletingYear(null))
  }

  /* Tabla de historial */
  return (
    <section className="registros-page">
      <header className="registros-header">
        <h1>Registros</h1>
        <p>Historial completo de elecciones por año.</p>
      </header>

      <div className="registros-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Estado</th>
              <th>Partidos</th>
              <th>Ganó</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Una fila por año en historial */}
            {!isLoading &&
              elections.map((item) => (
              <tr key={item.year}>
                <td>{formatElectionPeriod(item.year)}</td>
                <td>{item.isActive ? 'Activa' : 'Detenida'}</td>
                <td>{item.parties.map((party) => party.name).join(', ') || 'Sin partidos'}</td>
                <td>{getElectionWinner(item.parties).label}</td>
                <td>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDeleteElection(item.year)}
                    disabled={deletingYear === item.year}
                  >
                    {deletingYear === item.year ? 'Cargando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
              ))}
            {isLoading && (
              <tr>
                <td colSpan={5}>Cargando...</td>
              </tr>
            )}
            {!isLoading && elections.length === 0 && (
              <tr>
                <td colSpan={5}>No hay elecciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Registros
