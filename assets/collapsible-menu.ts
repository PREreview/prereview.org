export class CollapsibleMenu extends HTMLElement {
  static element = 'collapsible-menu' as const

  connectedCallback() {
    if (window.matchMedia('(min-width: 40em)').matches) {
      return
    }

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
    button.innerText = 'Menu'

    button.addEventListener('click', () => {
      button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true')
      nav.hidden = button.getAttribute('aria-expanded') === 'false'
    })

    this.prepend(button)
    nav.hidden = true
  }
}

window.customElements.define(CollapsibleMenu.element, CollapsibleMenu)

declare global {
  interface HTMLElementTagNameMap {
    [CollapsibleMenu.element]: CollapsibleMenu
  }
}
