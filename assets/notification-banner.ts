import { forceFocus } from './dom'

export class NotificationBanner extends HTMLElement {
  static element = 'notification-banner' as const

  constructor() {
    super()
  }

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
