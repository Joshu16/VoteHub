import { useEffect, useState } from 'react'
import './Registros.css'
import { deleteElectionByYear, getAllElections } from '../lib/electionsStore'

/* Revisar ganador por votos */
function getWinnerLabel(election) {
  if (!election.parties.length) {
    return 'Sin partidos'
  }

  let maxVotes = 0
  for (const party of election.parties) {
    const votes = Number(party.votes || 0)
    if (votes > maxVotes) {
      maxVotes = votes
    }
  }

  if (maxVotes === 0) {
    return 'Sin votos'
  }

  const winners = []
  for (const party of election.parties) {
    if (Number(party.votes || 0) === maxVotes) {
      winners.push(party.name)
    }
  }

  if (winners.length === 1) {
    return winners[0]
  }

  return `Empate: ${winners.join(', ')}`
}

/* Estado de carga y listado */
/* Historial de elecciones */
function Registros() {
  const [elections, setElections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingYear, setDeletingYear] = useState(null)

  /* Cargar registros */
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

  /* Eliminar una elección completa */
  const handleDeleteElection = (year) => {
    const shouldDelete = window.confirm(`Eliminar la elección del año ${year}?`)
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
            {!isLoading &&
              elections.map((item) => (
              <tr key={item.year}>
                <td>{item.year}</td>
                <td>{item.isActive ? 'Activa' : 'Detenida'}</td>
                <td>{item.parties.map((party) => party.name).join(', ') || 'Sin partidos'}</td>
                <td>{getWinnerLabel(item)}</td>
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
