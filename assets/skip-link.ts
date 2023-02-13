import { forceFocus } from './dom'

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
  const elementId = getFragmentFromUrl(target.href)

  if (!elementId) {
    return false
  }

  const element = document.getElementById(elementId)

  if (!element) {
    return false
  }

  forceFocus(element)

  return true
}

function getFragmentFromUrl(url: string) {
  if (url.indexOf('#') === -1) {
    return undefined
  }

  return url.split('#').pop()
}
