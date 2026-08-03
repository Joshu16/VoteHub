import '../styles/admin-forms.css'

/* Icono chevron para acordeones abiertos/cerrados */
export function AccordionChevron({ isOpen }) {
  return (
    <span className={`accordion-chevron${isOpen ? ' is-open' : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/* Campo de formulario admin con etiqueta y hints */
export function AdminField({ label, hint, required, optional, children }) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">
        {label}
        {required && <span className="field-required"> *</span>}
        {optional && <span className="admin-field__hint"> (opcional)</span>}
      </span>
      {children}
    </label>
  )
}

/* Input de texto estilizado para formularios admin */
export function AdminInput({ className = '', ...props }) {
  return <input className={`admin-input ${className}`.trim()} {...props} />
}

/* Select estilizado para formularios admin */
export function AdminSelect({ className = '', children, ...props }) {
  return (
    <select className={`admin-input admin-select ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}

/* Toggle switch con etiqueta y descripcion */
export function AdminSwitch({ label, description, checked, onChange }) {
  return (
    <div className="admin-switch-row">
      <div className="admin-switch-row__text">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
      <label className="admin-switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="admin-switch__track" />
      </label>
    </div>
  )
}

/* Zona de carga de archivo con vista previa de imagen */
export function AdminFileUpload({ label, optional, accept, onFile, preview, previewAlt }) {
  return (
    <div className="admin-file-upload">
      <AdminField label={label} optional={optional}>
        <div className="admin-file-upload__zone">
          <span className="admin-file-upload__icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>
          <div className="admin-file-upload__text">
            <strong>Seleccionar archivo</strong>
            <span>PNG o JPG</span>
          </div>
          <input type="file" accept={accept} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </AdminField>
      {preview && <img src={preview} alt={previewAlt || ''} className="admin-file-preview" />}
    </div>
  )
}

/* Lee archivo de imagen y devuelve data URL via callback */
export function loadImageFromFile(file, onDone, onError) {
  if (!file) return
  const isValidType = file.type === 'image/png' || file.type === 'image/jpeg'
  if (!isValidType) {
    onError?.('Solo se permite PNG o JPG.')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    onDone(typeof reader.result === 'string' ? reader.result : '')
    onError?.('')
  }
  reader.readAsDataURL(file)
}
