export class ConditionalInputs extends HTMLElement {
  static element = 'conditional-inputs' as const

  constructor() {
    super()

    this.addEventListener('input', () => {
      this.controllers.forEach(toggleControlledElement)
    })
  }

  connectedCallback() {
    this.controllers.forEach(toggleControlledElement)
  }

  private get controllers() {
    return this.querySelectorAll<HTMLInputElement>('input[type="radio"][aria-controls]')
  }
}

window.customElements.define(ConditionalInputs.element, ConditionalInputs)

declare global {
  interface HTMLElementTagNameMap {
    [ConditionalInputs.element]: ConditionalInputs
  }
}

function toggleControlledElement(node: HTMLInputElement) {
  const controlled = getControlledElement(node)

  if (!controlled) {
    return
  }

  controlled.hidden = !node.checked
}

function getControlledElement(node: HTMLInputElement) {
  const controlledId = node.getAttribute('aria-controls')

  if (!controlledId) {
    return null
  }

  return document.getElementById(controlledId)
}
