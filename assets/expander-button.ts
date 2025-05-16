export class ExpanderButton extends HTMLElement {
  static element = 'expander-button' as const
}

window.customElements.define(ExpanderButton.element, ExpanderButton)

declare global {
  interface HTMLElementTagNameMap {
    [ExpanderButton.element]: ExpanderButton
  }
}
