/* Nombre del evento global para refrescar datos del panel */
export const VOTEHUB_REFRESH_EVENT = 'votehub:refresh-data'

/* Dispara evento para que estadisticas y dashboard recarguen datos */
export function notifyDataRefresh() {
  window.dispatchEvent(new CustomEvent(VOTEHUB_REFRESH_EVENT))
}
