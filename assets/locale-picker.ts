export class LocalePicker extends HTMLElement {
  static element = 'locale-picker' as const
}

window.customElements.define(LocalePicker.element, LocalePicker)
