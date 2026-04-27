const PAGE_TRANSITION_EVENT = 'votehub:page-transition-start'
const PAGE_TRANSITION_COVER_MS = 300

function triggerPageTransition() {
  window.dispatchEvent(new CustomEvent(PAGE_TRANSITION_EVENT))
}

function navigateWithTransition(navigate, to, options = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const { delayMs = reduceMotion ? 0 : PAGE_TRANSITION_COVER_MS, replace = false, state } = options
  triggerPageTransition()
  window.setTimeout(() => {
    navigate(to, { replace, state })
  }, delayMs)
}

export { PAGE_TRANSITION_EVENT, PAGE_TRANSITION_COVER_MS, triggerPageTransition, navigateWithTransition }
