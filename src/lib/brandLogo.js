import logoCIT from '../assets/LogoCIT.webp'

/* Logo institucional del CIT */
export default logoCIT

/* Actualiza el favicon del navegador con el logo de marca */
export function applyBrandFavicon() {
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/webp'
  link.href = logoCIT
}
