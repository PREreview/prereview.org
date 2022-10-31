class ConditionalInputs extends HTMLElement {
  static element = 'conditional-inputs' as const

  constructor() {
    super()
  }

  connectedCallback() {
    const controllers = this.querySelectorAll<HTMLInputElement>('input[type="radio"][aria-controls]')

    controllers.forEach(toggleControlledElement)
    this.addEventListener('input', () => {
      controllers.forEach(toggleControlledElement)
    })
  }
}

window.customElements.define(ConditionalInputs.element, ConditionalInputs)

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
