import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'
import logoCIT from '../lib/brandLogo.js'
import heroInformacion from '../assets/hero-informacion.webp'
import { getActiveElection } from '../lib/electionsStore'
import { formatElectionPeriod } from '../lib/electionPeriod'
import { getLandingContent } from '../lib/landingStore'
import { parsePartyOfficers, PARTY_OFFICER_FIELDS } from '../lib/partyOfficers'

function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

function officerEntries(officersJson) {
  const officers = parsePartyOfficers(officersJson)
  return PARTY_OFFICER_FIELDS.map(({ key, label }) => {
    const name = (officers[key] || '').trim()
    if (!name) return null
    return { role: label, name }
  }).filter(Boolean)
}

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

function Landing() {
  const [content, setContent] = useState(null)
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getLandingContent(), getActiveElection()])
      .then(([landing, activeElection]) => {
        if (!alive) return
        setContent(landing)
        setElection(activeElection)
      })
      .catch(() => {
        if (!alive) return
        setContent(null)
        setElection(null)
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const isElectionActive = Boolean(election?.isActive)
  const candidateParties = (election?.parties || []).filter((p) => !esVotoNulo(p.name))
  const hasCandidates = isElectionActive && candidateParties.length > 0
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
    extras.length > 0 && { href: '#info', label: 'Informacion' },
  ].filter(Boolean)

  if (isLoading) {
    return (
      <div className="landing-page">
        <div className="landing-loading" aria-busy="true" aria-label="Cargando informacion electoral">
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
        <Link to="/menu" className="landing-brand" onClick={closeMenu}>
          <img src={logoCIT} alt="CIT" />
          <div>
            <span className="landing-brand-name">VoteHub</span>
            <span className="landing-brand-sub">Elecciones estudiantiles</span>
          </div>
        </Link>
        <button
          type="button"
          className={`landing-menu-toggle${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="landing-nav"
          aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="landing-menu-toggle-bar" aria-hidden />
          <span className="landing-menu-toggle-bar" aria-hidden />
          <span className="landing-menu-toggle-bar" aria-hidden />
        </button>
        <button
          type="button"
          className="landing-nav-backdrop"
          aria-label="Cerrar menu"
          onClick={closeMenu}
          tabIndex={menuOpen ? 0 : -1}
        />
        <nav id="landing-nav" className="landing-nav" aria-label="Secciones">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <Link to="/menu" className="landing-nav-menu" onClick={closeMenu}>
            Menú
          </Link>
        </nav>
      </header>

      <section
        className="landing-hero"
        style={{ backgroundImage: `url(${heroInformacion})` }}
      >
        <div className="landing-hero-overlay" aria-hidden />
        <div className="landing-hero-content">
          {isElectionActive && (
            <span className="landing-status">
              <span className="landing-status-dot" aria-hidden />
              Periodo {formatElectionPeriod(election.year)} · Proceso en curso
            </span>
          )}
          {!isElectionActive && (
            <span className="landing-status landing-status--muted">Información general</span>
          )}
          <h1>{content?.hero_title || 'Elecciones Estudiantiles CIT'}</h1>
          <p>{content?.hero_subtitle || 'Participa en la democracia de tu colegio'}</p>
          <div className="landing-hero-actions">
            <Link to="/menu" className="landing-hero-cta landing-hero-cta--primary">
              Acceder al sistema
            </Link>
            {hasCandidates && (
              <a href="#candidatos" className="landing-hero-cta landing-hero-cta--ghost">
                Ver candidatos
              </a>
            )}
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
                <p>Mesa directiva que representa al estudiantado en este periodo</p>
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
                    {members.map((member, index) => (
                      <div key={`${member.role}-${index}`} className="landing-roster-item">
                        <dt>{member.role}</dt>
                        <dd>{member.name}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="landing-empty landing-empty--roster">Indefinido</p>
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
                {isElectionActive
                  ? `Mesas directivas registradas para ${formatElectionPeriod(election.year)}`
                  : 'Partidos que participaran cuando haya elecciones activas'}
              </p>
            </div>
          </header>
          {hasCandidates ? (
            <div className="landing-candidates">
              {candidateParties.map((party) => {
                const participants = officerEntries(party.officers_json)
                return (
                  <article key={party.id} className="landing-candidate">
                    <div className="landing-candidate-logo">
                      {party.image_url ? (
                        <img src={party.image_url} alt={party.name} />
                      ) : (
                        <span>{party.name.slice(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <h3>{party.name}</h3>
                    {participants.length > 0 ? (
                      <dl className="landing-roster landing-roster--compact">
                        {participants.map((item) => (
                          <div key={`${party.id}-${item.role}`} className="landing-roster-item">
                            <dt>{item.role}</dt>
                            <dd>{item.name}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="landing-empty landing-empty--roster">Indefinido</p>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="landing-empty">Indefinido</p>
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
            <p className="landing-empty">Indefinido</p>
          )}
        </section>

        {extras.length > 0 && (
          <section className="landing-block landing-block--soft" id="info" data-reveal>
            <header className="landing-block-head">
              <span className="landing-block-tag">{sectionIndex(hasCurrentParty, 'info')}</span>
              <div>
                <h2>Informacion adicional</h2>
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
        <img src={logoCIT} alt="Complejo Educativo CIT" />
        <p>Complejo Educativo CIT · Proceso electoral estudiantil</p>
        <Link to="/menu" className="landing-footer-link">
          Ir al menú de acceso
        </Link>
      </footer>
    </div>
  )
}

export default Landing
