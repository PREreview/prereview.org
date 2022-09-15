class ErrorSummary extends HTMLElement {
  static element = 'error-summary' as const

  constructor() {
    super()

    forceFocus(this)
  }
}

window.customElements.define(ErrorSummary.element, ErrorSummary)

function forceFocus(element: HTMLElement) {
  element.setAttribute('tabindex', '-1')
  element.addEventListener(
    'blur',
    () => {
      element.removeAttribute('tabindex')
    },
    { once: true },
  )
  element.focus()
}
