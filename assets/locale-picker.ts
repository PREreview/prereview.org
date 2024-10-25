export class LocalePicker extends HTMLElement {
  static element = 'locale-picker' as const

  constructor() {
    super()

    this.addEventListener('click', event => {
      if (!(event.target instanceof HTMLElement)) {
        return
      }
      const locale = event.target.dataset['locale']
      if (locale !== undefined) {
        document.cookie = `locale=${locale};path=/;samesite=lax`
        window.scrollTo({ top: 0 })
        location.reload()

        event.preventDefault()
      }
    })
  }
}

window.customElements.define(LocalePicker.element, LocalePicker)
