import { disableButton, getLang } from './dom.js'
import { DefaultLocale, isSupportedLocale, translate } from './locales/index.js'

export class SingleUseForm extends HTMLElement {
  static element = 'single-use-form' as const

  constructor() {
    super()

    this.addEventListener('submit', this.onSubmit)
  }

  private onSubmit = (event: SubmitEvent) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) {
      return
    }

    if (form.dataset['submitted'] === 'true') {
      event.preventDefault()
    } else {
      const lang = getLang(this)
      const locale = isSupportedLocale(lang) ? lang : DefaultLocale

      const status = document.createElement('div')
      status.classList.add('submitting', 'visually-hidden')
      const statusText = document.createElement('span')
      statusText.textContent = translate(locale, 'single-use-form', 'working')()
      status.append(statusText)
      this.append(status)

      setTimeout(() => {
        status.classList.remove('visually-hidden')
        status.setAttribute('role', 'status')
      }, 1_000)
    }

    form.dataset['submitted'] = 'true'
    form.querySelectorAll('button').forEach(disableButton)
  }
}

window.customElements.define(SingleUseForm.element, SingleUseForm)

declare global {
  interface HTMLElementTagNameMap {
    [SingleUseForm.element]: SingleUseForm
  }
}
