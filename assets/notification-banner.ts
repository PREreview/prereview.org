import { forceFocus } from './dom'

export class NotificationBanner extends HTMLElement {
  static element = 'notification-banner' as const

  connectedCallback() {
    forceFocus(this)
    removeMessageParameter()
  }
}

window.customElements.define(NotificationBanner.element, NotificationBanner)

declare global {
  interface HTMLElementTagNameMap {
    [NotificationBanner.element]: NotificationBanner
  }
}

function removeMessageParameter() {
  const location = new URL(window.location.href)
  location.searchParams.delete('message')

  window.history.replaceState({}, document.title, location)
}
