import { Duration } from 'effect'

export class SpotlightBanner extends HTMLElement {
  static element = 'spotlight-banner' as const

  connectedCallback() {
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('dismiss')
    button.innerText = 'Dismiss'

    button.addEventListener('click', () => {
      this.remove()

      document.cookie = `dismiss-matchmaking-spotlight=true; max-age=${Duration.toSeconds('8 weeks')}; Path=/;`
    })

    this.append(button)
  }
}

window.customElements.define(SpotlightBanner.element, SpotlightBanner)

declare global {
  interface HTMLElementTagNameMap {
    [SpotlightBanner.element]: SpotlightBanner
  }
}
