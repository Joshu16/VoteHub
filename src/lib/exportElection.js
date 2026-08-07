import * as XLSX from 'xlsx'
import { Chart, registerables } from 'chart.js'
import { jsPDF } from 'jspdf'
import { formatElectionPeriod } from './electionPeriod'
import { getElectionWinner } from './electionWinner'
import { getVotesByGrado } from './electionsStore'
import { getVotersRegistryStats } from './voterRegistry'
import {
  CHART_COLORS,
  buildChartData,
  buildGradoStats,
  esVotoNulo,
} from './electionStats'

Chart.register(...registerables)

const ACCENT = '#00bec9'
const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'
const SOFT = '#f8fafc'

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

/* Nombre seguro para hoja de Excel */
function sheetName(value) {
  return String(value || 'Hoja')
    .replace(/[\\/*?[\]:]/g, ' ')
    .trim()
    .slice(0, 31) || 'Hoja'
}

/* Porcentaje con un decimal */
function pct(part, total) {
  if (!total) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

/* Crea canvas oculto en alta resolucion */
function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = width * scale
  canvas.height = height * scale
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  return { canvas, width, height }
}

/* Renderiza un Chart.js y espera a que este listo */
function renderChart(canvas, config) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (chart) => {
      if (settled) return
      settled = true
      resolve(chart)
    }

    const chart = new Chart(canvas, {
      ...config,
      options: {
        ...config.options,
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
      },
    })

    requestAnimationFrame(() => finish(chart))
  })
}

/* Grafico de barras profesional */
async function createBarChartImage(barras, title) {
  const safeBarras =
    barras.length > 0 ? barras : [{ nombre: 'Sin datos', votos: 0 }]
  const { canvas, width, height } = createOffscreenCanvas(860, 360)
  const chart = await renderChart(canvas, {
    type: 'bar',
    data: {
      labels: safeBarras.map((b) => b.nombre),
      datasets: [
        {
          label: 'Votos',
          data: safeBarras.map((b) => b.votos),
          backgroundColor: safeBarras.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 64,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title,
          color: INK,
          font: { size: 16, weight: '600', family: 'Segoe UI, Helvetica, Arial, sans-serif' },
          padding: { bottom: 16 },
        },
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          ticks: {
            color: MUTED,
            font: { size: 11, family: 'Segoe UI, Helvetica, Arial, sans-serif' },
            maxRotation: 35,
            minRotation: 0,
          },
          grid: { display: false },
          border: { color: LINE },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: MUTED,
            font: { size: 11, family: 'Segoe UI, Helvetica, Arial, sans-serif' },
          },
          grid: { color: LINE },
          border: { display: false },
        },
      },
      layout: { padding: { top: 8, right: 12, bottom: 4, left: 8 } },
    },
  })

  const dataUrl = canvas.toDataURL('image/png', 1)
  chart.destroy()
  return { dataUrl, width, height }
}

/* Grafico de dona profesional */
async function createDoughnutChartImage(pieData, title) {
  const safePie =
    pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1, color: '#d1d5db' }]
  const { canvas, width, height } = createOffscreenCanvas(860, 340)
  const chart = await renderChart(canvas, {
    type: 'doughnut',
    data: {
      labels: safePie.map((p) => p.name),
      datasets: [
        {
          data: safePie.map((p) => p.value),
          backgroundColor: safePie.map((p) => p.color),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 0,
        },
      ],
    },
    options: {
      cutout: '58%',
      plugins: {
        title: {
          display: true,
          text: title,
          color: INK,
          font: { size: 16, weight: '600', family: 'Segoe UI, Helvetica, Arial, sans-serif' },
          padding: { bottom: 12 },
        },
        legend: {
          position: 'right',
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            padding: 14,
            color: INK,
            font: { size: 12, family: 'Segoe UI, Helvetica, Arial, sans-serif' },
            generateLabels(chartInstance) {
              const data = chartInstance.data
              const total = data.datasets[0].data.reduce((s, n) => s + Number(n || 0), 0) || 1
              return data.labels.map((label, i) => {
                const value = Number(data.datasets[0].data[i] || 0)
                return {
                  text: `${label}: ${value} (${pct(value, total)})`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: '#ffffff',
                  lineWidth: 1,
                  hidden: false,
                  index: i,
                }
              })
            },
          },
        },
        tooltip: { enabled: false },
      },
      layout: { padding: 8 },
    },
  })

  const dataUrl = canvas.toDataURL('image/png', 1)
  chart.destroy()
  return { dataUrl, width, height }
}

/* Pie de pagina con numeracion */
function drawFooter(doc, page, total, period) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(LINE)
  doc.setLineWidth(0.4)
  doc.line(40, pageH - 36, pageW - 40, pageH - 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text(`VoteHub · Resultados ${period}`, 40, pageH - 22)
  doc.text(`Pagina ${page} de ${total}`, pageW - 40, pageH - 22, { align: 'right' })
}

/* Encabezado de seccion */
function drawSectionHeader(doc, title, subtitle) {
  doc.setFillColor(ACCENT)
  doc.roundedRect(40, 36, 6, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(INK)
  doc.text(title, 56, 52)
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(MUTED)
    doc.text(subtitle, 56, 66)
  }
}

/* Tarjetas KPI */
function drawKpiRow(doc, items, y) {
  const pageW = doc.internal.pageSize.getWidth()
  const gap = 10
  const margin = 40
  const cardW = (pageW - margin * 2 - gap * (items.length - 1)) / items.length
  const cardH = 48

  items.forEach((item, i) => {
    const x = margin + i * (cardW + gap)
    doc.setFillColor(SOFT)
    doc.setDrawColor(LINE)
    doc.setLineWidth(0.6)
    doc.roundedRect(x, y, cardW, cardH, 6, 6, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    doc.text(item.label, x + 10, y + 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(INK)
    doc.text(String(item.value), x + 10, y + 36)
  })

  return y + cardH
}

/* Tabla profesional */
function drawTable(doc, headers, rows, startY) {
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const tableW = pageW - margin * 2
  const colWs = [tableW * 0.55, tableW * 0.2, tableW * 0.25]
  const rowH = 22
  let y = startY

  const ensureSpace = (needed) => {
    const pageH = doc.internal.pageSize.getHeight()
    if (y + needed > pageH - 50) {
      doc.addPage()
      y = 48
    }
  }

  ensureSpace(rowH + 8)
  doc.setFillColor(ACCENT)
  doc.roundedRect(margin, y, tableW, rowH, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor('#ffffff')
  let x = margin
  headers.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right'
    const tx = i === 0 ? x + 10 : x + colWs[i] - 10
    doc.text(h, tx, y + 14, { align })
    x += colWs[i]
  })
  y += rowH + 2

  rows.forEach((row, rowIndex) => {
    ensureSpace(rowH)
    if (rowIndex % 2 === 0) {
      doc.setFillColor('#ffffff')
    } else {
      doc.setFillColor(SOFT)
    }
    doc.setDrawColor(LINE)
    doc.rect(margin, y, tableW, rowH, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(INK)
    x = margin
    row.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right'
      const tx = i === 0 ? x + 10 : x + colWs[i] - 10
      if (i === 0 && row.muted) doc.setTextColor(MUTED)
      else doc.setTextColor(INK)
      doc.text(String(cell), tx, y + 14, { align })
      x += colWs[i]
    })
    y += rowH
  })

  return y
}

/* Inserta imagen de grafico centrada manteniendo aspecto */
function addChartImage(doc, image, y, maxWidth = 515) {
  const pageW = doc.internal.pageSize.getWidth()
  const ratio = image.height / image.width
  const drawW = Math.min(maxWidth, pageW - 80)
  const drawH = drawW * ratio
  const x = (pageW - drawW) / 2
  doc.addImage(image.dataUrl, 'PNG', x, y, drawW, drawH, undefined, 'FAST')
  return y + drawH
}

/* Pagina de portada */
function addCoverPage(doc, { period, winner, general, enrolled, gradoCount }) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setFillColor(ACCENT)
  doc.rect(0, 0, pageW, 120, 'F')
  doc.setFillColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('VOTEHUB', 40, 42)
  doc.setFontSize(26)
  doc.text('Informe de resultados', 40, 78)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(`Elecciones estudiantiles · Periodo ${period}`, 40, 98)

  let y = 150
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(MUTED)
  doc.text('RESULTADO', 40, y)
  y += 18
  doc.setFontSize(22)
  doc.setTextColor(INK)
  doc.text(String(winner.label), 40, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(MUTED)
  doc.text(`${winner.maxVotes} voto${winner.maxVotes === 1 ? '' : 's'}`, 40, y)

  y += 28
  drawKpiRow(
    doc,
    [
      { label: 'Votos totales', value: general.totalVotes },
      { label: 'Estudiantes', value: enrolled },
      { label: 'Participacion', value: `${general.participationPercent}%` },
      { label: 'Generaciones', value: gradoCount },
    ],
    y,
  )

  y += 72
  doc.setDrawColor(LINE)
  doc.setLineWidth(0.6)
  doc.line(40, y, pageW - 40, y)
  y += 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(
    'Este documento incluye resultados generales, graficos de votos y distribucion,',
    40,
    y,
  )
  y += 14
  doc.text('mas un desglose completo por cada generacion del padron electoral.', 40, y)

  doc.setFontSize(8)
  doc.text(`Generado ${new Date().toLocaleString('es-CR')}`, 40, pageH - 40)
}

/* Pagina de seccion con graficos y tabla */
async function addStatsSection(doc, {
  title,
  subtitle,
  kpis,
  chartData,
  tableRows,
  period,
}) {
  doc.addPage()
  drawSectionHeader(doc, title, subtitle)
  let y = 84
  y = drawKpiRow(doc, kpis, y) + 18

  const barImage = await createBarChartImage(chartData.barras, 'Votos por partido')
  y = addChartImage(doc, barImage, y) + 14

  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 220) {
    doc.addPage()
    y = 48
  }

  const pieImage = await createDoughnutChartImage(chartData.pieData, 'Distribucion de votos')
  y = addChartImage(doc, pieImage, y) + 16

  if (y > pageH - 120) {
    doc.addPage()
    y = 48
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(INK)
  doc.text('Detalle tabular', 40, y)
  y += 10
  drawTable(doc, ['Partido', 'Votos', 'Porcentaje'], tableRows, y)

  // footers applied later once total pages known
  void period
}

/* Exporta Excel con hojas por grado */
function exportExcel(period, winner, parties, general, gradoStats) {
  const wb = XLSX.utils.book_new()

  const generalRows = [
    ['Periodo', period],
    ['Resultado', winner.label],
    ['Votos del resultado', winner.maxVotes],
    ['Votos totales', general.totalVotes],
    ['Estudiantes', general.enrolled],
    ['Participacion %', general.participationPercent],
    ['Abstenciones', general.abstentions],
    [],
    ['Partido', 'Votos', 'Porcentaje'],
    ...parties.map((p) => [p.name, p.votes, pct(p.votes, general.totalVotes)]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(generalRows), 'General')

  const resumenGrado = [
    ['Grado', 'Estudiantes', 'Votos', 'Abstenciones', 'Participacion %'],
    ...gradoStats.map((g) => {
      const part = g.enrolled ? ((g.totalVotes / g.enrolled) * 100).toFixed(1) : '0.0'
      return [g.grado, g.enrolled, g.totalVotes, g.abstentions, `${part}%`]
    }),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenGrado), 'Resumen grados')

  const matrixHeader = ['Partido', ...gradoStats.map((g) => g.grado), 'Total']
  const matrixRows = [matrixHeader]
  for (const party of parties) {
    const row = [party.name]
    let total = 0
    for (const g of gradoStats) {
      const found = g.parties.find((p) => p.name === party.name)
      const votes = found ? found.votes : 0
      row.push(votes)
      total += votes
    }
    row.push(total)
    matrixRows.push(row)
  }
  const abstRow = ['Abstencion']
  let abstTotal = 0
  for (const g of gradoStats) {
    abstRow.push(g.abstentions)
    abstTotal += g.abstentions
  }
  abstRow.push(abstTotal)
  matrixRows.push(abstRow)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrixRows), 'Matriz por grado')

  for (const g of gradoStats) {
    const charts = buildChartData(g.parties, g.enrolled)
    const rows = [
      ['Grado', g.grado],
      ['Estudiantes', g.enrolled],
      ['Votos', charts.totalVotes],
      ['Abstenciones', charts.abstentions],
      ['Participacion %', `${charts.participationPercent}%`],
      [],
      ['Partido', 'Votos', 'Porcentaje'],
      ...g.parties.map((p) => [p.name, p.votes, pct(p.votes, charts.totalVotes)]),
      ...(charts.abstentions > 0
        ? [['Abstencion', charts.abstentions, pct(charts.abstentions, g.enrolled)]]
        : []),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName(g.grado))
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `eleccion_${period}.xlsx`,
  )
}

/* Exporta resultados en Excel (por grados) y PDF profesional con Chart.js */
export async function exportElectionData(election) {
  const allParties = election?.parties || []
  if (!election || election.isActive || allParties.length === 0) {
    return { ok: false, reason: 'INVALID' }
  }

  const parties = allParties
    .filter((p) => !esVotoNulo(p.name))
    .map((p) => ({ id: p.id, name: p.name, votes: Number(p.votes || 0) }))
    .sort((a, b) => b.votes - a.votes)

  const period = formatElectionPeriod(election.year)
  const winner = getElectionWinner(allParties)

  const [gradoRows, voterStats] = await Promise.all([
    getVotesByGrado(election.year),
    getVotersRegistryStats(),
  ])

  const enrolled = Number(voterStats.total || 0)
  const general = {
    ...buildChartData(parties, enrolled),
    enrolled,
  }
  const gradoStats = buildGradoStats(gradoRows, voterStats.byGrado)

  exportExcel(period, winner, parties, general, gradoStats)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  addCoverPage(doc, {
    period,
    winner,
    general,
    enrolled,
    gradoCount: gradoStats.length,
  })

  const generalTable = [
    ...parties.map((p) => [p.name, p.votes, pct(p.votes, general.totalVotes)]),
    ...(general.abstentions > 0
      ? [
          Object.assign(['Abstencion', general.abstentions, pct(general.abstentions, enrolled)], {
            muted: true,
          }),
        ]
      : []),
  ]

  await addStatsSection(doc, {
    title: 'Resultados generales',
    subtitle: `Periodo ${period}`,
    kpis: [
      { label: 'Votos totales', value: general.totalVotes },
      { label: 'Estudiantes', value: enrolled },
      { label: 'Participacion', value: `${general.participationPercent}%` },
      { label: 'Abstenciones', value: general.abstentions },
    ],
    chartData: general,
    tableRows: generalTable,
    period,
  })

  for (const g of gradoStats) {
    const charts = buildChartData(g.parties, g.enrolled)
    const tableRows = [
      ...g.parties.map((p) => [p.name, p.votes, pct(p.votes, charts.totalVotes)]),
      ...(charts.abstentions > 0
        ? [
            Object.assign(
              ['Abstencion', charts.abstentions, pct(charts.abstentions, g.enrolled)],
              { muted: true },
            ),
          ]
        : []),
    ]

    await addStatsSection(doc, {
      title: g.grado,
      subtitle: `Generacion · Periodo ${period}`,
      kpis: [
        { label: 'Votos', value: charts.totalVotes },
        { label: 'Estudiantes', value: g.enrolled },
        { label: 'Participacion', value: `${charts.participationPercent}%` },
        { label: 'Abstenciones', value: charts.abstentions },
      ],
      chartData: charts,
      tableRows,
      period,
    })
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages, period)
  }

  doc.save(`eleccion_${period}.pdf`)
  return { ok: true }
}
