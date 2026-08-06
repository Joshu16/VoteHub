import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingAdmin.css'
import { DEFAULT_LANDING, getLandingContent, saveLandingContent } from '../lib/landingStore'

const SECTIONS = [
  { id: 'hero', label: 'Encabezado' },
  { id: 'partido', label: 'Partido en el poder' },
  { id: 'fechas', label: 'Fechas' },
  { id: 'extra', label: 'Datos extra' },
]

/* Editor admin del contenido de la landing publica */
function LandingAdmin() {
  const [activeSection, setActiveSection] = useState('hero')
  const [content, setContent] = useState(() => ({ ...DEFAULT_LANDING }))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  /* Carga contenido actual de la landing al montar */
  useEffect(() => {
    setIsLoading(true)
    getLandingContent()
      .then((data) => setContent(data))
      .catch((error) =>
        setFeedback(`No se pudo cargar: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsLoading(false))
  }, [])

  /* Actualiza un campo simple del contenido */
  const updateField = (field, value) => {
    setContent((prev) => ({ ...prev, [field]: value }))
  }

  /* Actualiza un item dentro de una lista editable */
  const updateListItem = (field, index, key, value) => {
    setContent((prev) => {
      const list = [...(prev[field] || [])]
      list[index] = { ...list[index], [key]: value }
      return { ...prev, [field]: list }
    })
  }

  /* Agrega item vacio a una lista editable */
  const addListItem = (field, emptyItem) => {
    setContent((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), emptyItem],
    }))
  }

  /* Elimina item de una lista editable por indice */
  const removeListItem = (field, index) => {
    setContent((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }))
  }

  /* Convierte imagen subida a data URL para el partido actual */
  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const isValidType = file.type === 'image/png' || file.type === 'image/jpeg'
    if (!isValidType) {
      setFeedback('La imagen debe ser PNG o JPG.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateField('current_party_image', typeof reader.result === 'string' ? reader.result : '')
      setFeedback('')
    }
    reader.readAsDataURL(file)
  }

  /* Persiste cambios del contenido en Supabase */
  const handleSave = () => {
    setIsSaving(true)
    setFeedback('')
    saveLandingContent(content)
      .then((result) => {
        if (result.tableMissing) {
          setFeedback(
            'Falta configurar la tabla landing_content en Supabase.',
          )
          return
        }
        if (!result.ok) {
          setFeedback('No se pudo guardar.')
          return
        }
        setContent(result.data)
        setFeedback('Cambios guardados correctamente.')
      })
      .catch((error) =>
        setFeedback(`Error al guardar: ${error?.message || 'Error desconocido'}`),
      )
      .finally(() => setIsSaving(false))
  }

  return (
    <section className="landing-admin-page">
      <header className="landing-admin-header">
        <div>
          <h1>Información pública</h1>
          <p>Textos e imágenes que todos pueden ver en la página de información electoral. Los candidatos aparecen solos cuando hay elecciones activas.</p>
        </div>
        <div className="landing-admin-header-actions">
          <Link to="/" target="_blank" rel="noreferrer" className="landing-admin-preview">
            Ver cómo queda
          </Link>
          <button type="button" onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </header>

      {feedback && <p className="landing-admin-feedback">{feedback}</p>}

      <nav className="landing-admin-tabs" aria-label="Secciones">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={activeSection === id ? 'active' : ''}
            onClick={() => setActiveSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <p className="landing-admin-loading">Cargando contenido...</p>
      ) : (
        <div className="landing-admin-panel">
          {activeSection === 'hero' && (
            <div className="landing-admin-section">
              <h2>Encabezado</h2>
              <p className="landing-admin-hint">Título y descripción principal de la página informativa.</p>
              <label className="landing-admin-field">
                Título
                <input
                  type="text"
                  value={content.hero_title}
                  onChange={(event) => updateField('hero_title', event.target.value)}
                />
              </label>
              <label className="landing-admin-field">
                Subtítulo
                <textarea
                  rows={4}
                  value={content.hero_subtitle}
                  onChange={(event) => updateField('hero_subtitle', event.target.value)}
                />
              </label>
            </div>
          )}

          {activeSection === 'partido' && (
            <div className="landing-admin-section">
              <h2>Partido en el poder</h2>
              <p className="landing-admin-hint">Mesa directiva actual del estudiantado.</p>
              <div className="landing-admin-split">
                <div className="landing-admin-split-main">
                  <label className="landing-admin-field">
                    Nombre del partido
                    <input
                      type="text"
                      value={content.current_party_name}
                      onChange={(event) => updateField('current_party_name', event.target.value)}
                    />
                  </label>
                  <label className="landing-admin-field">
                    Descripción
                    <textarea
                      rows={5}
                      value={content.current_party_description}
                      onChange={(event) => updateField('current_party_description', event.target.value)}
                    />
                  </label>
                </div>
                <div className="landing-admin-split-aside">
                  <label className="landing-admin-field">
                    Imagen (PNG/JPG)
                    <input type="file" accept=".png,.jpg,.jpeg" onChange={handleImageChange} />
                  </label>
                  <div className="landing-admin-image-frame">
                    {content.current_party_image ? (
                      <img
                        src={content.current_party_image}
                        alt="Vista previa"
                        className="landing-admin-image-preview"
                      />
                    ) : (
                      <div className="landing-admin-image-empty">Sin imagen</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="landing-admin-list-toolbar">
                <h3>Participantes</h3>
                <button
                  type="button"
                  className="landing-admin-add"
                  onClick={() => addListItem('current_party_members', { role: '', name: '' })}
                >
                  + Agregar
                </button>
              </div>
              {(content.current_party_members || []).map((member, index) => (
                <div key={`member-${index}`} className="landing-admin-list-row">
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={member.role}
                    onChange={(event) =>
                      updateListItem('current_party_members', index, 'role', event.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={member.name}
                    onChange={(event) =>
                      updateListItem('current_party_members', index, 'name', event.target.value)
                    }
                  />
                  <button type="button" onClick={() => removeListItem('current_party_members', index)}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'fechas' && (
            <div className="landing-admin-section">
              <div className="landing-admin-list-toolbar">
                <div>
                  <h2>Fechas importantes</h2>
                  <p className="landing-admin-hint">Calendario del proceso electoral.</p>
                </div>
                <button
                  type="button"
                  className="landing-admin-add"
                  onClick={() => addListItem('important_dates', { date: '', title: '', description: '' })}
                >
                  + Agregar fecha
                </button>
              </div>
              {(content.important_dates || []).length === 0 && (
                <p className="landing-admin-empty">No hay fechas registradas.</p>
              )}
              {(content.important_dates || []).map((item, index) => (
                <article key={`date-${index}`} className="landing-admin-card">
                  <label className="landing-admin-field">
                    Fecha
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        updateListItem('important_dates', index, 'date', event.target.value)
                      }
                    />
                  </label>
                  <label className="landing-admin-field">
                    Título
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) =>
                        updateListItem('important_dates', index, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label className="landing-admin-field">
                    Descripción
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(event) =>
                        updateListItem('important_dates', index, 'description', event.target.value)
                      }
                    />
                  </label>
                  <button type="button" className="landing-admin-remove" onClick={() => removeListItem('important_dates', index)}>
                    Eliminar fecha
                  </button>
                </article>
              ))}
            </div>
          )}

          {activeSection === 'extra' && (
            <div className="landing-admin-section">
              <div className="landing-admin-list-toolbar">
                <div>
                  <h2>Datos extra</h2>
                  <p className="landing-admin-hint">Bloques informativos adicionales.</p>
                </div>
                <button
                  type="button"
                  className="landing-admin-add"
                  onClick={() => addListItem('extra_sections', { title: '', content: '' })}
                >
                  + Agregar bloque
                </button>
              </div>
              {(content.extra_sections || []).length === 0 && (
                <p className="landing-admin-empty">No hay bloques adicionales.</p>
              )}
              {(content.extra_sections || []).map((item, index) => (
                <article key={`extra-${index}`} className="landing-admin-card">
                  <label className="landing-admin-field">
                    Título
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) =>
                        updateListItem('extra_sections', index, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label className="landing-admin-field">
                    Contenido
                    <textarea
                      rows={4}
                      value={item.content}
                      onChange={(event) =>
                        updateListItem('extra_sections', index, 'content', event.target.value)
                      }
                    />
                  </label>
                  <button type="button" className="landing-admin-remove" onClick={() => removeListItem('extra_sections', index)}>
                    Eliminar bloque
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default LandingAdmin
