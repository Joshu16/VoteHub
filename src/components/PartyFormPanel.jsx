import {
  EMPTY_PARTY_OFFICERS,
  PARTY_OFFICER_FIELDS,
} from '../lib/partyOfficers'
import {
  AdminField,
  AdminFileUpload,
  AdminInput,
  loadImageFromFile,
} from './AdminUI'

export function PartyFormPanel({
  partyName,
  setPartyName,
  partyImage,
  setPartyImage,
  partyMascot,
  setPartyMascot,
  partyOfficers,
  setPartyOfficers,
  formError,
  isSaving,
  onSave,
  onCancel,
  onDelete,
  showDelete,
  saveLabel = 'Guardar',
  nameOnly = false,
}) {
  if (nameOnly) {
    return (
      <div className="party-form-panel">
        <AdminField label="Nombre del partido" required>
          <AdminInput
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Nombre del partido"
          />
        </AdminField>
        {formError && <p className="modal-error">{formError}</p>}
        <div className="party-form-actions">
          <div className="party-form-actions-right">
            <button type="button" className="icon-btn" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="icon-btn" onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : saveLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="party-form-panel">
      <div className="party-form-grid">
        <div className="party-form-column party-form-column--identity">
          <AdminField label="Nombre del partido" required>
            <AdminInput
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="Nombre del partido"
            />
          </AdminField>
          <AdminFileUpload
            label="Logo"
            accept=".png,.jpg,.jpeg"
            preview={partyImage}
            previewAlt="Logo"
            onFile={(file) =>
              loadImageFromFile(file, setPartyImage, () => {})
            }
          />
          <AdminFileUpload
            label="Mascota"
            optional
            accept=".png,.jpg,.jpeg"
            preview={partyMascot}
            previewAlt="Mascota"
            onFile={(file) =>
              loadImageFromFile(file, setPartyMascot, () => {})
            }
          />
        </div>
        <div className="party-form-column party-form-column--officers">
          <div className="party-officers-two-cols">
            {PARTY_OFFICER_FIELDS.map(({ key, label, placeholder, required }) => (
              <AdminField key={key} label={label} required={required} optional={!required}>
                <AdminInput
                  type="text"
                  value={partyOfficers[key]}
                  onChange={(e) =>
                    setPartyOfficers((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                />
              </AdminField>
            ))}
          </div>
        </div>
      </div>
      {formError && <p className="modal-error">{formError}</p>}
      <div className="party-form-actions">
        {showDelete && (
          <button type="button" className="icon-btn danger" onClick={onDelete} disabled={isSaving}>
            Eliminar
          </button>
        )}
        <div className="party-form-actions-right">
          <button type="button" className="icon-btn" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="icon-btn" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function emptyPartyFormState() {
  return {
    partyName: '',
    partyImage: '',
    partyMascot: '',
    partyOfficers: { ...EMPTY_PARTY_OFFICERS },
  }
}
