import { forceFocus, getTargetElement } from './dom'

export class SkipLink extends HTMLElement {
  static element = 'skip-link' as const

  constructor() {
    super()
  }

  connectedCallback() {
    this.addEventListener('click', event => {
      const { target } = event

      if (!(target instanceof HTMLAnchorElement)) {
        return
      }

      if (focusTarget(target)) {
        event.preventDefault()
      }
    })
  }
}

window.customElements.define(SkipLink.element, SkipLink)

function focusTarget(target: HTMLAnchorElement) {
  const element = getTargetElement(target)

  if (!element) {
    return false
  }

  forceFocus(element)

  return true
}
