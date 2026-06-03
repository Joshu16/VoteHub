import logoCIT from '../assets/LogoCIT.webp'

export default logoCIT

export function applyBrandFavicon() {
  let iconLink = document.querySelector("link[rel='icon']")
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.setAttribute('rel', 'icon')
    document.head.appendChild(iconLink)
  }
  iconLink.setAttribute('href', logoCIT)
  iconLink.setAttribute('type', 'image/webp')
}
