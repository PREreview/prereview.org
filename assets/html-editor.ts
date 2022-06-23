export class HtmlEditor extends HTMLElement {
  static element = 'html-editor' as const

  constructor() {
    super()
  }
}

window.customElements.define(HtmlEditor.element, HtmlEditor)
