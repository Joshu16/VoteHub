export const VOTEHUB_REFRESH_EVENT = 'votehub:refresh-data'

export function notifyDataRefresh() {
  window.dispatchEvent(new CustomEvent(VOTEHUB_REFRESH_EVENT))
}
