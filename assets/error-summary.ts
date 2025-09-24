import { forceFocus, getTargetElement } from './dom.ts'

export class ErrorSummary extends HTMLElement {
  static element = 'error-summary' as const

  constructor() {
    super()

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

  connectedCallback() {
    forceFocus(this)
  }
}

function focusTarget(target: HTMLAnchorElement) {
  const input = getTargetElement(target)

  if (
    !(input instanceof HTMLElement) ||
    (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement) && !input.isContentEditable)
  ) {
    return false
  }

  const legendOrLabel = getAssociatedLegendOrLabel(input)

  if (!legendOrLabel) {
    return false
  }

  input.focus({ preventScroll: true })
  legendOrLabel.scrollIntoView()

  return true
}

function getAssociatedLegendOrLabel(input: HTMLElement) {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    const fieldset = input.closest('fieldset')

    if (fieldset) {
      const candidateLegend = fieldset.getElementsByTagName('legend')[0]

      if (candidateLegend instanceof HTMLLegendElement) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          return candidateLegend
        }

        const legendTop = candidateLegend.getBoundingClientRect().top
        const inputRect = input.getBoundingClientRect()

        if (inputRect.height && window.innerHeight) {
          const inputBottom = inputRect.top + inputRect.height

          if (inputBottom - legendTop < window.innerHeight / 2) {
            return candidateLegend
          }
        }
      }
    }
  }

  const labelledBy = input.getAttribute('aria-labelledby')

  if (typeof labelledBy === 'string') {
    return document.getElementById(labelledBy)
  }

  const id = input.getAttribute('id')

  return typeof id === 'string'
    ? document.querySelector<HTMLLabelElement>(`label[for="${id}"]`)
    : input.closest('label')
}

window.customElements.define(ErrorSummary.element, ErrorSummary)

declare global {
  interface HTMLElementTagNameMap {
    [ErrorSummary.element]: ErrorSummary
  }
}
