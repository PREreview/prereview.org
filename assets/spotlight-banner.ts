import { Duration } from 'effect'
import { getLocale } from './dom.ts'

const translateDep = import('./locales/index.ts')

export class SpotlightBanner extends HTMLElement {
  static element = 'spotlight-banner' as const

  async connectedCallback() {
    const id = this.dataset['spotlightBannerId']

    if (typeof id !== 'string') {
      return
    }

    const { translate } = await translateDep

    const locale = getLocale(this)

    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('dismiss')
    button.append(translate(locale, 'spotlight-banner', 'dismiss')())

    button.addEventListener('click', () => {
      this.remove()

      document.cookie = `dismiss-spotlight-banner-${id}=true; max-age=${Duration.toSeconds('8 weeks')}; Path=/;`
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
