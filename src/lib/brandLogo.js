import logoCIT from '../assets/LogoCIT.webp'

export default logoCIT

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
