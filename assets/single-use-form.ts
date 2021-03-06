class SingleUseForm extends HTMLElement {
  static element = 'single-use-form' as const

  constructor() {
    super()

    const form = this.firstElementChild

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('No form')
    }

    this.addEventListener('submit', event => {
      if (form.dataset.submitted === 'true') {
        event.preventDefault()
      }

      form.dataset.submitted = 'true'
      form.querySelectorAll('button').forEach(disableButton)
    })
  }
}

window.customElements.define(SingleUseForm.element, SingleUseForm)

function disableButton(button: HTMLButtonElement): void {
  button.disabled = true
}
