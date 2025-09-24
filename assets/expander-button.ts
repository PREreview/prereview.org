import { getFocusableElements, nextFocusableElement } from './dom.ts'

export class ExpanderButton extends HTMLElement {
  static element = 'expander-button' as const
  private observer?: MutationObserver

  connectedCallback() {
    const link = this.querySelector('a')
    const button = this.querySelector<HTMLButtonElement>('button')

    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('No link')
    }

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('No button')
    }

    const controlled = document.getElementById(button.getAttribute('aria-controls') ?? '')

    if (!(controlled instanceof HTMLElement)) {
      return
    }

    this.observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'aria-expanded') {
          return
        }

        controlled.hidden = button.getAttribute('aria-expanded') === 'false'
      }
    })

    this.observer.observe(button, { attributes: true })
    link.hidden = true
    button.hidden = false

    button.addEventListener('click', () => {
      button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true')

      const parent = this.parentElement

      if (!parent) {
        return
      }

      parent.querySelectorAll('[aria-expanded]').forEach(otherButton => {
        if (otherButton === button) {
          return
        }

        otherButton.setAttribute('aria-expanded', 'false')
      })
    })

    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        button.setAttribute('aria-expanded', 'false')
        return
      }

      if (event.key !== 'Tab' || controlled.hidden || document.activeElement !== button) {
        return
      }

      const focusableElements = getFocusableElements(controlled)
      const firstFocusableElement = focusableElements[0]

      if (!event.shiftKey && firstFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    })

    controlled.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        button.setAttribute('aria-expanded', 'false')
        button.focus()
        return
      }

      if (event.key !== 'Tab' || controlled.hidden) {
        return
      }

      const focusableElements = getFocusableElements(controlled)
      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements[focusableElements.length - 1]

      switch (document.activeElement) {
        case lastFocusableElement:
          if (!event.shiftKey) {
            event.preventDefault()
            button.setAttribute('aria-expanded', 'false')
            controlled.hidden = true
            nextFocusableElement(button)?.focus()
          }
          break
        case firstFocusableElement:
          if (event.shiftKey) {
            event.preventDefault()
            button.focus()
          }
          break
        default:
          break
      }
    })
  }

  disconnectedCallback() {
    this.observer?.disconnect()
  }
}

window.customElements.define(ExpanderButton.element, ExpanderButton)

declare global {
  interface HTMLElementTagNameMap {
    [ExpanderButton.element]: ExpanderButton
  }
}
