import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './PadronImport.css'
import '../styles/admin-forms.css'
import { parseVoterRegistryFile } from '../lib/voterParse'
import { getVotersRegistryStats, replaceVotersRegistry } from '../lib/voterRegistry'

/* Pagina de importacion del padron electoral desde Excel/CSV */
function PadronImport() {
  const fileInputRef = useRef(null)
  const [stats, setStats] = useState({ total: 0, byGrado: {} })
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  /* Carga estadisticas del padron actual */
  const loadStats = async () => {
    try {
      const data = await getVotersRegistryStats()
      setStats(data)
    } catch {
      setStats({ total: 0, byGrado: {} })
    }
  }

  useEffect(() => {
    loadStats().finally(() => setIsLoading(false))
  }, [])

  /* Parsea archivo seleccionado y muestra vista previa */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    setFeedback('')
    setError('')
    setPreview(null)
    setFileName('')

    if (!file) return

    setIsParsing(true)
    try {
      const parsed = await parseVoterRegistryFile(file)
      setPreview(parsed)
      setFileName(file.name)
    } catch (err) {
      setError(err?.message || 'No se pudo leer el archivo.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsParsing(false)
    }
  }

  /* Reemplaza padron completo con datos del archivo */
  const handleImport = async () => {
    if (!preview?.voters?.length) return

    const ok = window.confirm(
      `Se reemplazara el padron actual (${stats.total} votantes) por ${preview.total} registros del archivo. Continuar?`,
    )
    if (!ok) return

    setFeedback('')
    setError('')
    setIsImporting(true)

    try {
      const result = await replaceVotersRegistry(preview.voters)
      setFeedback(`Padron importado: ${result.inserted} votantes registrados.`)
      setPreview(null)
      setFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadStats()
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('No autorizado')) {
        setError('Sesion expirada. Vuelve a iniciar sesion como administrador.')
      } else if (msg.includes('does not exist') || msg.includes('schema cache')) {
        setError('Falta la tabla voters. Ejecuta la migracion 20260723120000_voters_registry.sql en Supabase.')
      } else {
        setError(msg || 'No se pudo importar el padron.')
      }
    } finally {
      setIsImporting(false)
    }
  }

  /* Cancela vista previa y limpia input de archivo */
  const handleClearPreview = () => {
    setPreview(null)
    setFileName('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const gradosActuales = Object.entries(stats.byGrado).sort(([a], [b]) => a.localeCompare(b, 'es'))
  const gradosPreview = preview ? Object.entries(preview.byGrado).sort(([a], [b]) => a.localeCompare(b, 'es')) : []

  return (
    <section className="padron-page">
      <header className="padron-header">
        <div>
          <h1>Padron electoral</h1>
          <p>Importa el listado de estudiantes desde CSV o Excel. Cada importacion reemplaza el padron completo.</p>
        </div>
        <Link to="/menu" className="padron-menu-link">
          Volver al menu
        </Link>
      </header>

      {feedback && <p className="padron-feedback">{feedback}</p>}
      {error && <p className="padron-error">{error}</p>}

      <article className="padron-card">
        <h2>Padron actual</h2>
        {isLoading ? (
          <p className="padron-muted">Cargando...</p>
        ) : stats.total === 0 ? (
          <p className="padron-muted">No hay votantes registrados. Sube un archivo para comenzar.</p>
        ) : (
          <>
            <p className="padron-total">
              <strong>{stats.total}</strong> votantes en total
            </p>
            <ul className="padron-grado-list">
              {gradosActuales.map(([grado, count]) => (
                <li key={grado}>
                  <span>{grado || 'Sin grado'}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>

      <article className="padron-card">
        <h2>Importar archivo</h2>
        <p className="padron-desc">
          Formato compatible con el Excel del colegio: columnas de identificacion, nombre, apellidos y especialidad.
          En Excel cada hoja representa un grado; en CSV incluye una columna Grado o Nivel.
        </p>

        <div className="padron-upload">
          <label className="padron-upload-zone">
            <span className="padron-upload-icon" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="padron-upload-text">
              <strong>{isParsing ? 'Leyendo archivo...' : 'Seleccionar .csv o .xlsx'}</strong>
              <span>Se borrara el padron anterior al confirmar la importacion</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isParsing || isImporting}
            />
          </label>
        </div>

        {fileName && preview && (
          <div className="padron-preview">
            <div className="padron-preview-header">
              <h3>Vista previa: {fileName}</h3>
              <button type="button" className="padron-btn padron-btn--muted" onClick={handleClearPreview}>
                Cancelar
              </button>
            </div>
            <p className="padron-total">
              <strong>{preview.total}</strong> votantes detectados
            </p>
            <ul className="padron-grado-list">
              {gradosPreview.map(([grado, count]) => (
                <li key={grado}>
                  <span>{grado || 'Sin grado'}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="padron-btn padron-btn--primary"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? 'Importando...' : 'Confirmar importacion'}
            </button>
          </div>
        )}
      </article>
    </section>
  )
}

export default PadronImport
