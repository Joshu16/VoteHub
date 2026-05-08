export function formatElectionPeriod(year) {
  const baseYear = Number(year)
  if (!Number.isInteger(baseYear)) {
    return String(year ?? '')
  }
  return `${baseYear}-${baseYear + 1}`
}
