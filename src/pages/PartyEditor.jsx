import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import '../styles/admin-forms.css'
import { editParty, ensureElection, getActiveElection } from '../lib/electionsStore'
import { formatElectionPeriod } from '../lib/electionPeriod'
import { parsePartyOfficers, serializePartyOfficers } from '../lib/partyOfficers'
import { PartyFormPanel, emptyPartyFormState } from '../components/PartyFormPanel'
import { clearEditorSession, getEditorSession, validateEditorSession } from '../lib/editorSession'
import { getEditorAssignment } from '../lib/partyEditors'
import { AccordionChevron } from '../components/AdminUI'

function PartyEditor() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [session, setSession] = useState(() => getEditorSession())
  const [assignment, setAssignment] = useState(null)
  const [election, setElection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [formState, setFormState] = useState(emptyPartyFormState)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSavingParty, setIsSavingParty] = useState(false)
  const electionYear = Number(election?.year ?? currentYear)

  useEffect(() => {
    const s = getEditorSession()
    if (!s) {
      navigate('/editor-login', { replace: true })
      return
    }
    validateEditorSession().then((valid) => {
      if (!valid) {
        navigate('/editor-login', { replace: true })
        return
      }
      setSession(getEditorSession())
    })
  }, [navigate])

  useEffect(() => {
    if (!session) return
    const load = async () => {
      setIsLoading(true)
      try {
        const [assign, activeElection] = await Promise.all([
          getEditorAssignment(session.email),
          getActiveElection(),
        ])
        if (!assign?.partyId) {
          setFeedback('No tienes un partido asignado. Contacta al administrador.')
          setAssignment(null)
          return
        }
        setAssignment(assign)
        const el = activeElection || (await ensureElection(currentYear))
        setElection(el)
        const party =
          assign.party ||
          el.parties?.find((p) => p.id === assign.partyId)
        if (party) {
          setFormState({
            partyName: party.name,
            partyImage: party.image_url || '',
            partyMascot: party.mascot_url || '',
            partyOfficers: parsePartyOfficers(party.officers_json),
          })
        }
      } catch (error) {
        setFeedback(`No se pudo cargar: ${error?.message || 'Error desconocido'}`)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [session, currentYear])

  const handleSaveParty = () => {
    const nombre = formState.partyName.trim()
    if (!nombre) {
      setFormError('El nombre del partido es obligatorio.')
      return
    }
    if (!assignment?.partyId) return
    setFormError('')
    setIsSavingParty(true)
    const officersJson = serializePartyOfficers(formState.partyOfficers)
    editParty(
      electionYear,
      assignment.partyId,
      nombre,
      formState.partyImage || null,
      formState.partyMascot || null,
      officersJson,
    )
      .then((result) => {
        if (!result?.ok) {
          setFormError('No se pudo guardar.')
          return
        }
        setFeedback('Partido actualizado.')
      })
      .catch((error) =>
        setFormError(`No se pudo guardar: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSavingParty(false))
  }

  const handleLogout = () => {
    clearEditorSession()
    navigate('/editor-login', { replace: true })
  }

  if (!session) return null

  const partyName = assignment?.party?.name || formState.partyName || 'Tu partido'

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>Editor de partidos</h1>
        <p>
          {session.name || session.email} · {formatElectionPeriod(electionYear)}
        </p>
      </header>

      <div className="action-row">
        <button type="button" className="icon-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
      {feedback && <p className="dashboard-feedback">{feedback}</p>}

      <div className="party-accordion-list">
        {isLoading && <p className="party-accordion-loading">Cargando...</p>}

        {!isLoading && !assignment && (
          <p className="party-accordion-empty">Sin partido asignado.</p>
        )}

        {!isLoading && assignment && (
          <article className={`party-accordion-item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="party-accordion-header"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
            >
              <div className="party-accordion-header-left">
                {formState.partyImage && (
                  <img src={formState.partyImage} alt="" className="party-accordion-thumb" />
                )}
                <span className="party-accordion-title">{partyName}</span>
              </div>
              <AccordionChevron isOpen={isOpen} />
            </button>
            {isOpen && (
              <PartyFormPanel
                partyName={formState.partyName}
                setPartyName={(v) => setFormState((s) => ({ ...s, partyName: v }))}
                partyImage={formState.partyImage}
                setPartyImage={(v) => setFormState((s) => ({ ...s, partyImage: v }))}
                partyMascot={formState.partyMascot}
                setPartyMascot={(v) => setFormState((s) => ({ ...s, partyMascot: v }))}
                partyOfficers={formState.partyOfficers}
                setPartyOfficers={(fn) =>
                  setFormState((s) => ({
                    ...s,
                    partyOfficers: typeof fn === 'function' ? fn(s.partyOfficers) : fn,
                  }))
                }
                formError={formError}
                isSaving={isSavingParty}
                onSave={handleSaveParty}
                onCancel={() => setIsOpen(false)}
                saveLabel="Guardar cambios"
              />
            )}
          </article>
        )}
      </div>
    </section>
  )
}

export default PartyEditor
