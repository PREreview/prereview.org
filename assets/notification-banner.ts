import { forceFocus } from './dom.js'

export class NotificationBanner extends HTMLElement {
  static element = 'notification-banner' as const

  connectedCallback() {
    forceFocus(this)
  }
}

window.customElements.define(NotificationBanner.element, NotificationBanner)

declare global {
  interface HTMLElementTagNameMap {
    [NotificationBanner.element]: NotificationBanner
  }
}
