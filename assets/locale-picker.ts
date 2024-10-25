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
        document.cookie = `locale=${locale}`
        location.reload()
      }
    })
  }
}

window.customElements.define(LocalePicker.element, LocalePicker)
