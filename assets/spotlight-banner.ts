export class SpotlightBanner extends HTMLElement {
  static element = 'spotlight-banner' as const
}

window.customElements.define(SpotlightBanner.element, SpotlightBanner)

declare global {
  interface HTMLElementTagNameMap {
    [SpotlightBanner.element]: SpotlightBanner
  }
}
