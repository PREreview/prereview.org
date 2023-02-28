import { disableButton } from './dom'

export class SingleUseForm extends HTMLElement {
  static element = 'single-use-form' as const

  constructor() {
    super()
  }

  connectedCallback() {
    this.addEventListener('submit', event => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) {
        return
      }

      if (form.dataset.submitted === 'true') {
        event.preventDefault()
      }

      form.dataset.submitted = 'true'
      form.querySelectorAll('button').forEach(disableButton)
    })
  }
}

window.customElements.define(SingleUseForm.element, SingleUseForm)
