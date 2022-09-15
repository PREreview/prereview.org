class ErrorSummary extends HTMLElement {
  static element = 'error-summary' as const

  constructor() {
    super()

    forceFocus(this)

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

function focusTarget(target: HTMLAnchorElement) {
  const inputId = getFragmentFromUrl(target.href)

  if (!inputId) {
    return false
  }

  const input = document.getElementById(inputId)

  if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement) && !input?.isContentEditable) {
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

function getFragmentFromUrl(url: string) {
  if (url.indexOf('#') === -1) {
    return undefined
  }

  return url.split('#').pop()
}

function getAssociatedLegendOrLabel(input: HTMLElement) {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    const fieldset = input.closest('fieldset')

    if (fieldset) {
      const legends = fieldset.getElementsByTagName('legend')

      if (legends.length) {
        const candidateLegend = legends[0]

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

  if (labelledBy) {
    return document.getElementById(labelledBy)
  }

  const id = input.getAttribute('id')

  return id ? document.querySelector<HTMLLabelElement>(`label[for="${id}"]`) : input.closest('label')
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
