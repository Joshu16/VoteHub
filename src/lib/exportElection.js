import { formatElectionPeriod } from './electionPeriod'
import { getElectionWinner } from './electionWinner'

/* Escapa texto para celdas CSV */
function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/* Dispara descarga de un Blob con nombre de archivo */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/* Escapa texto para contenido PDF literal */
function pdfEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/* Genera un PDF de texto simple sin dependencias */
function buildSimplePdf(lines) {
  const sanitized = lines.map((line) => pdfEscape(line).slice(0, 110))
  const contentLines = ['BT', '/F1 11 Tf', '50 800 Td', '14 TL']
  sanitized.forEach((line, index) => {
    if (index === 0) contentLines.push(`(${line}) Tj`)
    else contentLines.push(`T* (${line}) Tj`)
  })
  contentLines.push('ET')
  const stream = contentLines.join('\n')

  const objects = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
  )
  objects.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefStart}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

/* Exporta resultados de una eleccion en CSV y PDF */
export function exportElectionData(election) {
  const parties = election?.parties || []
  if (!election || election.isActive || parties.length === 0) {
    return { ok: false, reason: 'INVALID' }
  }

  const period = formatElectionPeriod(election.year)
  const winner = getElectionWinner(parties)
  const baseName = `eleccion_${period}`

  const csvRows = [['Periodo', 'Partido', 'Votos']]
  for (const party of parties) {
    csvRows.push([period, party.name, String(party.votes || 0)])
  }
  const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\n')
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }), `${baseName}.csv`)

  const fold = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const pdfLines = [
    fold(`VoteHub - Resultados ${period}`),
    '',
    fold(`Resultado: ${winner.label}`),
    fold(`Votos del resultado: ${winner.maxVotes}`),
    '',
    'Partido | Votos',
    ...parties.map((party) => fold(`${party.name} | ${Number(party.votes || 0)}`)),
  ]

  window.setTimeout(() => {
    downloadBlob(buildSimplePdf(pdfLines), `${baseName}.pdf`)
  }, 350)

  return { ok: true }
}
