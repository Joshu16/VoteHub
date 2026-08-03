/* Formatea año escolar como periodo (ej. 2026-2027) */
export function formatElectionPeriod(year) {
  const baseYear = Number(year)
  if (!Number.isInteger(baseYear)) {
    return String(year ?? '')
  }
  return `${baseYear}-${baseYear + 1}`
}

/* Convierte fecha ISO a texto legible en español */
export function formatDisplayDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* Une fecha inicio y fin en un rango legible */
export function formatDateRange(startDate, endDate) {
  const start = formatDisplayDate(startDate)
  const end = formatDisplayDate(endDate)
  if (start && end) return `${start} – ${end}`
  if (start) return `Desde ${start}`
  if (end) return `Hasta ${end}`
  return ''
}
