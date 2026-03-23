import './Estadisticas.css'

const barras = [
  { nombre: 'Partido 1', votos: 650 },
  { nombre: 'Partido 2', votos: 820 },
  { nombre: 'Partido 3', votos: 740 },
  { nombre: 'Partido 4', votos: 980 },
]

function Estadisticas() {
  return (
    <section className="stats-page">
      <header className="stats-header">
        <h1>Estadisticas Administrativas</h1>
        <p>Vista visual sin logica, lista para integracion.</p>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span>Votos Totales</span>
          <strong>2212</strong>
        </article>
        <article className="kpi-card">
          <span>Partidos</span>
          <strong>4</strong>
        </article>
        <article className="kpi-card">
          <span>Estudiantes</span>
          <strong>15</strong>
        </article>
        <article className="kpi-card">
          <span>Votos Nulos</span>
          <strong>03</strong>
        </article>
      </div>

      <section className="chart-card">
        <h2>Votos por partido</h2>
        <div className="bar-chart">
          {barras.map((item) => (
            <div key={item.nombre} className="bar-item">
              <div className="bar" style={{ height: `${item.votos / 4}px` }} />
              <span>{item.nombre}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

export default Estadisticas
