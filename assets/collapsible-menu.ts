import { getLang } from './dom.js'
import { DefaultLocale, isSupportedLocale } from './locales/index.js'

const translateDep = import('./locales/index.js')

export class CollapsibleMenu extends HTMLElement {
  static element = 'collapsible-menu' as const

  async connectedCallback() {
    const nav = this.firstElementChild

    if (!(nav instanceof HTMLElement) || nav.localName !== 'nav') {
      throw new Error('No nav')
    }

    if (!nav.id) {
      nav.id = 'nav'
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-controls', nav.id)

    const { translate } = await translateDep

    const lang = getLang(this)
    const locale = isSupportedLocale(lang) ? lang : DefaultLocale

    button.innerText = translate(locale, 'collapsible-menu')('menu')()

    button.addEventListener('click', () => {
      button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true')
      nav.hidden = button.getAttribute('aria-expanded') === 'false'
    })

    const onSizeChange = ({ matches }: Pick<MediaQueryList, 'matches'>) => {
      button.hidden = matches
      nav.hidden = matches ? false : button.getAttribute('aria-expanded') === 'false'
    }

    const isSmallerScreen = window.matchMedia('(min-width: 40em)')

    onSizeChange(isSmallerScreen)
    isSmallerScreen.addEventListener('change', onSizeChange)

    this.prepend(button)
  }
}

window.customElements.define(CollapsibleMenu.element, CollapsibleMenu)

declare global {
  interface HTMLElementTagNameMap {
    [CollapsibleMenu.element]: CollapsibleMenu
  }
}
