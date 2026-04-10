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

      <div className="stats-layout">
        <div className="stats-main">
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
              {barras.map((item, index) => (
                <div key={item.nombre} className="bar-item">
                  <div className={`bar tone-${index + 1}`} style={{ height: `${item.votos / 4}px` }} />
                  <span>{item.nombre}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="abstention-card">
          <h2>Niveles de abstinencia</h2>
          <p className="abstention-voted">
            <span className="dot dot-accent"></span>
            Votaron
          </p>
          <div className="donut-wrap">
            <div className="donut-chart">
              <div className="donut-inner">33%</div>
            </div>
          </div>
          <ul className="abstention-list">
            <li><span className="dot tone-1"></span>Partido 1: 1000 votos</li>
            <li><span className="dot tone-2"></span>Partido 2: 1000 votos</li>
            <li><span className="dot tone-3"></span>Partido 3: 1000 votos</li>
            <li><span className="dot tone-4"></span>Partido 4: 1000 votos</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

export default Estadisticas
