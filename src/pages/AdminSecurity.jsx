import { useEffect, useState } from 'react'
import './AdminSecurity.css'
import '../styles/admin-forms.css'
import { getAdminSessionEmail } from '../lib/adminAuth'
import {
  addAdminUser,
  isPrincipalAdminEmail,
  listAdminUsers,
  PRINCIPAL_ADMIN_EMAIL,
  removeAdminUser,
} from '../lib/adminUsers'
import { addPartyEditor, listPartyEditors, removePartyEditor } from '../lib/partyEditors'
import { ensureElection, getActiveElection } from '../lib/electionsStore'
import { AdminField, AdminInput, AdminSelect } from '../components/AdminUI'

/* Detecta si un partido es voto nulo */
function esVotoNulo(nombre) {
  return String(nombre || '').trim().toLowerCase() === 'voto nulo'
}

/* Pagina de gestion de admins y editores de partidos */
function AdminSecurity() {
  const currentYear = new Date().getFullYear()
  const [feedback, setFeedback] = useState('')
  const [admins, setAdmins] = useState([])
  const [isPrincipal, setIsPrincipal] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [editors, setEditors] = useState([])
  const [parties, setParties] = useState([])
  const [editorEmail, setEditorEmail] = useState('')
  const [editorName, setEditorName] = useState('')
  const [editorPartyId, setEditorPartyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  /* Carga lista de administradores */
  const loadAdmins = async () => {
    try {
      const data = await listAdminUsers()
      setAdmins(data)
    } catch {
      setAdmins([{ id: 'principal', email: PRINCIPAL_ADMIN_EMAIL, is_principal: true }])
    }
  }

  /* Carga lista de editores de partidos */
  const loadEditors = async () => {
    try {
      const data = await listPartyEditors()
      setEditors(data)
    } catch {
      setEditors([])
    }
  }

  /* Carga partidos disponibles para asignar editores */
  const loadParties = async () => {
    try {
      const election = (await getActiveElection()) || (await ensureElection(currentYear))
      const list = (election?.parties || []).filter((p) => !esVotoNulo(p.name))
      setParties(list)
      if (list.length && !editorPartyId) setEditorPartyId(list[0].id)
    } catch {
      setParties([])
    }
  }

  /* Inicializa datos y comprueba si es admin principal */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const sessionEmail = getAdminSessionEmail()
      setIsPrincipal(await isPrincipalAdminEmail(sessionEmail))
      await Promise.all([loadAdmins(), loadEditors(), loadParties()])
      setIsLoading(false)
    }
    init()
  }, [currentYear])

  /* Agrega nuevo administrador por correo */
  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim()
    if (!email) return
    try {
      const result = await addAdminUser(email)
      if (!result.ok) {
        if (result.reason === 'DUPLICATE') setFeedback('Ese correo ya es administrador.')
        else if (result.reason === 'PRINCIPAL') setFeedback('Ese correo ya es el administrador principal.')
        else if (result.reason === 'NO_TABLE') {
          setFeedback('Falta la tabla admin_users. Ejecuta la migración 20260622140000.')
        }
        return
      }
      setNewAdminEmail('')
      setFeedback('Administrador agregado.')
      await loadAdmins()
    } catch (error) {
      setFeedback(`Error: ${error?.message || 'desconocido'}`)
    }
  }

  /* Elimina un administrador no principal */
  const handleRemoveAdmin = async (id) => {
    try {
      await removeAdminUser(id)
      setFeedback('Administrador eliminado.')
      await loadAdmins()
    } catch {
      setFeedback('No se pudo eliminar.')
    }
  }

  /* Asigna editor a un partido */
  const handleAddEditor = async () => {
    const email = editorEmail.trim()
    if (!email) return
    if (!editorPartyId) {
      setFeedback('Selecciona un partido.')
      return
    }
    try {
      const result = await addPartyEditor(email, editorName, editorPartyId)
      if (!result.ok) {
        if (result.reason === 'DUPLICATE') setFeedback('Ese correo ya está registrado.')
        else if (result.reason === 'NO_TABLE') setFeedback('Falta la tabla party_editors.')
        return
      }
      setEditorEmail('')
      setEditorName('')
      setFeedback('Editor asignado al partido.')
      await loadEditors()
    } catch (error) {
      setFeedback(`Error: ${error?.message || 'desconocido'}`)
    }
  }

  /* Elimina un editor de partido */
  const handleRemoveEditor = async (id) => {
    try {
      await removePartyEditor(id)
      setFeedback('Editor eliminado.')
      await loadEditors()
    } catch {
      setFeedback('No se pudo eliminar el editor.')
    }
  }

  return (
    <section className="security-page">
      <header className="security-header">
        <h1>Seguridad y roles</h1>
        <p>Administradores y editores de partidos. El acceso es por correo y código.</p>
      </header>

      {feedback && <p className="security-feedback">{feedback}</p>}

      <article className="security-card">
        <h2>Administradores</h2>
        <p className="security-desc">
          Principal: <strong>{PRINCIPAL_ADMIN_EMAIL}</strong>. Puede añadir más correos con acceso al panel.
        </p>

        <ul className="editors-list">
          {admins.map((admin) => (
            <li key={admin.id} className="editor-item">
              <div>
                <strong>{admin.email}</strong>
                <span>{admin.is_principal ? 'Administrador principal' : 'Administrador'}</span>
              </div>
              {isPrincipal && !admin.is_principal && (
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => handleRemoveAdmin(admin.id)}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>

        {isPrincipal && (
          <div className="editor-add-form editor-add-form--admins">
            <AdminField label="Nuevo administrador">
              <AdminInput
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </AdminField>
            <button type="button" className="icon-btn editor-add-btn" onClick={handleAddAdmin}>
              Agregar admin
            </button>
          </div>
        )}
      </article>

      <article className="security-card">
        <h2>Editores de partidos</h2>
        <p className="security-desc">
          Asigna un correo de estudiante a un partido. Ingresará con código por email.
        </p>

        <div className="editor-add-form">
          <AdminField label="Correo del estudiante">
            <AdminInput
              type="email"
              value={editorEmail}
              onChange={(e) => setEditorEmail(e.target.value)}
              placeholder="estudiante@correo.com"
            />
          </AdminField>
          <AdminField label="Nombre">
            <AdminInput
              type="text"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Opcional"
            />
          </AdminField>
          <AdminField label="Partido asignado">
            <AdminSelect value={editorPartyId} onChange={(e) => setEditorPartyId(e.target.value)}>
              <option value="">Seleccionar partido</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <button type="button" className="icon-btn editor-add-btn" onClick={handleAddEditor}>
            Asignar editor
          </button>
        </div>

        <ul className="editors-list">
          {isLoading && <li>Cargando...</li>}
          {!isLoading && editors.length === 0 && (
            <li className="editors-empty">No hay editores registrados.</li>
          )}
          {!isLoading &&
            editors.map((editor) => (
              <li key={editor.id} className="editor-item">
                <div>
                  <strong>{editor.voter_name || editor.display_email}</strong>
                  <span>
                    {editor.display_email}
                    {editor.party_name ? ` · ${editor.party_name}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => handleRemoveEditor(editor.id)}
                >
                  Quitar
                </button>
              </li>
            ))}
        </ul>
      </article>
    </section>
  )
}

export default AdminSecurity
