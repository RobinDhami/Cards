export function navigateGuest(event: { preventDefault: () => void }, href: string) {
  event.preventDefault()
  window.history.pushState({}, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
