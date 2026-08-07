import { useEffect, useState } from 'react'
import './Landing.css'
import logoCIT from '../lib/brandLogo.js'
import heroImage from '../assets/Hero.avif'
import { getPublicElection } from '../lib/electionsStore'
import { formatElectionPeriod } from '../lib/electionPeriod'
import { getLandingContent } from '../lib/landingStore'
import { parsePartyOfficers, PARTY_OFFICER_FIELDS } from '../lib/partyOfficers'
import { VOTEHUB_REFRESH_EVENT } from '../lib/dataRefresh'

/* Detecta si un partido es voto nulo */
function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Extrae cargos del partido; si falta el nombre indica que no hay ese cargo */
function officerEntries(officersJson) {
  const officers = parsePartyOfficers(officersJson)
  return PARTY_OFFICER_FIELDS.map(({ key, label }) => {
    const name = (officers[key] || '').trim()
    return {
      role: label,
      name: name || `No hay ${label.toLowerCase()}`,
      isEmpty: !name,
    }
  })
}

/* Formatea fecha para mostrar en la landing */
function formatDisplayDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* Numero de seccion segun bloques visibles */
function sectionIndex(hasCurrentParty, slot) {
  let n = 1
  if (hasCurrentParty) {
    if (slot === 'partido') return '01'
    n = 2
  }
  if (slot === 'candidatos') return String(n).padStart(2, '0')
  n += 1
  if (slot === 'fechas') return String(n).padStart(2, '0')
  n += 1
  return String(n).padStart(2, '0')
}

/* Tarjeta de un partido candidato */
function CandidateCard({ party }) {
  const participants = officerEntries(party.officers_json)
  const lead = participants[0]
  const rest = participants.slice(1)
  const hasMascot = Boolean(party.mascot_url)
  return (
    <article className="landing-candidate">
      <div
        className={`landing-candidate-visual${hasMascot ? '' : ' landing-candidate-visual--solo'}`}
      >
        <div className="landing-candidate-logo">
          {party.image_url ? (
            <img src={party.image_url} alt={party.name} />
          ) : (
            <span>{party.name.slice(0, 3).toUpperCase()}</span>
          )}
        </div>
        {hasMascot && (
          <div className="landing-candidate-mascot" aria-hidden="true">
            <img src={party.mascot_url} alt="" />
          </div>
        )}
      </div>
      <div className="landing-candidate-title">
        <h3>{party.name}</h3>
        {lead && (
          <p className={`landing-candidate-lead${lead.isEmpty ? ' is-empty' : ''}`}>
            {lead.isEmpty ? lead.name : `${lead.role}: ${lead.name}`}
          </p>
        )}
      </div>
      <ul className="landing-candidate-team">
        {rest.map((item) => (
          <li key={`${party.id}-${item.role}`} className={item.isEmpty ? 'is-empty' : undefined}>
            <span className="landing-candidate-team-role">{item.role}</span>
            <span className="landing-candidate-team-name">{item.name}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

/* Carrusel de partidos: muestra 2 por pagina con flechas */
function CandidateCarousel({ parties }) {
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(2)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setPerPage(mq.matches ? 1 : 2)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const totalPages = Math.max(1, Math.ceil(parties.length / perPage))

  useEffect(() => {
    setPage(0)
  }, [parties.length, perPage])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  const visible = parties.slice(page * perPage, page * perPage + perPage)
  const showControls = parties.length > perPage

  return (
    <div className="landing-candidates-carousel">
      <div className="landing-candidates-carousel-row">
        <button
          type="button"
          className="landing-carousel-btn"
          onClick={() => setPage((p) => p - 1)}
          disabled={!showControls || page === 0}
          aria-label="Ver partidos anteriores"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="landing-candidates-viewport">
          <div className="landing-candidates" data-per-page={perPage}>
            {visible.map((party) => (
              <CandidateCard key={party.id} party={party} />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="landing-carousel-btn"
          onClick={() => setPage((p) => p + 1)}
          disabled={!showControls || page >= totalPages - 1}
          aria-label="Ver siguientes partidos"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {showControls && (
        <p className="landing-carousel-status" aria-live="polite">
          {page + 1} de {totalPages}
        </p>
      )}
    </div>
  )
}

/* Pagina publica de informacion electoral */
function Landing() {
  const [content, setContent] = useState(null)
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  /* Carga contenido editable y eleccion activa; refresca al recibir evento o cada 20s */
  useEffect(() => {
    let alive = true

    const load = ({ quiet = false } = {}) => {
      if (!quiet) setIsLoading(true)
      return Promise.all([getLandingContent(), getPublicElection({ force: quiet })])
        .then(([landing, activeElection]) => {
          if (!alive) return
          setContent(landing)
          setElection(activeElection)
        })
        .catch(() => {
          if (!alive) return
          if (!quiet) {
            setContent(null)
            setElection(null)
          }
        })
        .finally(() => {
          if (alive && !quiet) setIsLoading(false)
        })
    }

    load()

    const onRefresh = () => {
      load({ quiet: true })
    }
    window.addEventListener(VOTEHUB_REFRESH_EVENT, onRefresh)
    const pollId = window.setInterval(() => load({ quiet: true }), 20000)

    return () => {
      alive = false
      window.removeEventListener(VOTEHUB_REFRESH_EVENT, onRefresh)
      window.clearInterval(pollId)
    }
  }, [])

  const isElectionActive = Boolean(election?.isActive)
  const candidateParties = (election?.parties || []).filter((p) => !esVotoNulo(p.name))
  const showPartiesEnabled =
    election?.show_parties != null ? Boolean(election.show_parties) : isElectionActive
  const hasCandidates = showPartiesEnabled && candidateParties.length > 0
  const members = (content?.current_party_members || []).filter(
    (member) => String(member?.role || '').trim() && String(member?.name || '').trim(),
  )
  const dates = (content?.important_dates || []).filter(
    (item) => String(item?.date || '').trim() && String(item?.title || '').trim(),
  )
  const extras = content?.extra_sections || []
  const hasCurrentParty =
    content?.current_party_name ||
    content?.current_party_description ||
    content?.current_party_image ||
    members.length > 0

  /* Scroll en topbar y animaciones reveal al cargar */
  useEffect(() => {
    if (isLoading) return undefined

    const topbar = document.querySelector('.landing-topbar')
    const onScroll = () => {
      topbar?.classList.toggle('landing-topbar--scrolled', window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const revealEls = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    revealEls.forEach((el) => observer.observe(el))

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [isLoading, hasCurrentParty, hasCandidates, dates.length, extras.length])

  /* Bloquea scroll y escucha Escape con menu movil abierto */
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

  const navLinks = [
    hasCurrentParty && { href: '#partido-actual', label: 'Partido actual' },
    { href: '#candidatos', label: 'Candidatos' },
    { href: '#fechas', label: 'Fechas' },
    extras.length > 0 && { href: '#info', label: 'Información' },
  ].filter(Boolean)

  if (isLoading) {
    return (
      <div className="landing-page">
        <div className="landing-loading" aria-busy="true" aria-label="Cargando información electoral">
          <div className="landing-loading-card">
            <div className="landing-skeleton landing-skeleton--logo" />
            <div className="landing-skeleton landing-skeleton--title" />
            <div className="landing-skeleton landing-skeleton--line" />
            <div className="landing-skeleton landing-skeleton--line landing-skeleton--short" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <header className={`landing-topbar${menuOpen ? ' landing-topbar--menu-open' : ''}`}>
        <div className="landing-brand">
          <img src={logoCIT} alt="CIT" />
          <div>
            <span className="landing-brand-name">VoteHub</span>
            <span className="landing-brand-sub">Elecciones estudiantiles</span>
          </div>
        </div>
        <button
          type="button"
          className={`landing-menu-toggle${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="landing-nav"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="landing-menu-toggle-bar" aria-hidden />
          <span className="landing-menu-toggle-bar" aria-hidden />
          <span className="landing-menu-toggle-bar" aria-hidden />
        </button>
        <button
          type="button"
          className="landing-nav-backdrop"
          aria-label="Cerrar menú"
          onClick={closeMenu}
          tabIndex={menuOpen ? 0 : -1}
        />
        <nav id="landing-nav" className="landing-nav" aria-label="Secciones">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section
        className="landing-hero"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="landing-hero-overlay" aria-hidden />
        <div className="landing-hero-content">
          {isElectionActive && (
            <span className="landing-status">
              <span className="landing-status-dot" aria-hidden />
              Período {formatElectionPeriod(election.year)}
              {' · Proceso en curso'}
            </span>
          )}
          {!isElectionActive && (
            <span className="landing-status landing-status--muted">Información general</span>
          )}
          <h1>{content?.hero_title || 'Elecciones Estudiantiles CIT'}</h1>
          <p>{content?.hero_subtitle || 'Participa en la democracia de tu colegio'}</p>
          <div className="landing-hero-actions">
            <a href="#candidatos" className="landing-hero-cta landing-hero-cta--primary">
              Ver candidatos
            </a>
            <a href="#fechas" className="landing-hero-cta landing-hero-cta--ghost">
              Ver próximas fechas
            </a>
          </div>
        </div>
        <a href="#candidatos" className="landing-scroll-hint" aria-label="Desplazarse al contenido">
          <span className="landing-scroll-hint-line" aria-hidden />
        </a>
      </section>

      <main className="landing-main">
        {hasCurrentParty && (
          <section className="landing-block" id="partido-actual" data-reveal>
            <header className="landing-block-head">
              <span className="landing-block-tag">{sectionIndex(true, 'partido')}</span>
              <div>
                <h2>Partido en el poder</h2>
                <p>Mesa directiva que representa al estudiantado en este período</p>
              </div>
            </header>
            <div className="landing-current">
              <figure className="landing-current-media">
                {content.current_party_image ? (
                  <img src={content.current_party_image} alt={content.current_party_name || 'Partido actual'} />
                ) : (
                  <div className="landing-current-placeholder landing-current-placeholder--luma">
                    <span>LUMA</span>
                  </div>
                )}
              </figure>
              <div className="landing-current-body">
                {content.current_party_name && <h3>{content.current_party_name}</h3>}
                {content.current_party_description && <p>{content.current_party_description}</p>}
                {members.length > 0 ? (
                  <dl className="landing-roster">
                    {members.map((member, index) => {
                      const role = String(member.role || '').trim() || 'Cargo'
                      const name = String(member.name || '').trim()
                      const displayName = name || `No hay ${role.toLowerCase()}`
                      return (
                        <div
                          key={`${role}-${index}`}
                          className={`landing-roster-item${name ? '' : ' is-empty'}`}
                        >
                          <dt>{role}</dt>
                          <dd>{displayName}</dd>
                        </div>
                      )
                    })}
                  </dl>
                ) : (
                  <p className="landing-empty landing-empty--roster">
                    No hay miembros de la mesa directiva
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="landing-block landing-block--soft" id="candidatos" data-reveal>
          <header className="landing-block-head">
            <span className="landing-block-tag">{sectionIndex(hasCurrentParty, 'candidatos')}</span>
            <div>
              <h2>Partidos candidatos</h2>
              <p>
                {hasCandidates
                  ? `Mesas directivas registradas para ${formatElectionPeriod(election.year)}`
                  : 'No hay partidos candidatos'}
              </p>
            </div>
          </header>
          {hasCandidates ? (
            <CandidateCarousel parties={candidateParties} />
          ) : (
            <p className="landing-empty">No hay partidos candidatos</p>
          )}
        </section>

        <section className="landing-block" id="fechas" data-reveal>
          <header className="landing-block-head">
            <span className="landing-block-tag">{sectionIndex(hasCurrentParty, 'fechas')}</span>
            <div>
              <h2>Fechas importantes</h2>
              <p>Calendario del proceso electoral</p>
            </div>
          </header>
          {dates.length > 0 ? (
            <ol className="landing-timeline">
              {dates.map((item, index) => (
                <li key={`${item.date}-${index}`} className="landing-timeline-item">
                  <div className="landing-timeline-marker" aria-hidden />
                  <article>
                    <time dateTime={item.date}>{formatDisplayDate(item.date)}</time>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <p className="landing-empty">No hay fechas definidas</p>
          )}
        </section>

        {extras.length > 0 && (
          <section className="landing-block landing-block--soft" id="info" data-reveal>
            <header className="landing-block-head">
              <span className="landing-block-tag">{sectionIndex(hasCurrentParty, 'info')}</span>
              <div>
                <h2>Información adicional</h2>
                <p>Detalles y contexto del proceso</p>
              </div>
            </header>
            <div className="landing-info-grid">
              {extras.map((item, index) => (
                <article key={`${item.title}-${index}`} className="landing-info-card">
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src={logoCIT} alt="Complejo Educativo CIT" />
          <div className="landing-footer-copy">
            <strong>Complejo Educativo CIT</strong>
            <span>Proceso electoral estudiantil · VoteHub</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
