import './Voting.css'

const candidates = [
  { id: 1, name: 'Partido 1' },
  { id: 2, name: 'Partido 2' },
  { id: 3, name: 'Partido 3' },
  { id: 4, name: 'Partido 4' },
]

function Voting() {
  return (
    <section className="voting-page">
      <header>
        <h1>Votacion</h1>
        <p>Plantilla base para conectar voto real despues.</p>
      </header>

      <div className="candidate-grid">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="candidate-card">
            <h3>{candidate.name}</h3>
            <p>Candidato / Formula</p>
            <button type="button">Seleccionar</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Voting
