export class CollapsibleMenu extends HTMLElement {
  static element = 'collapsible-menu' as const
}

window.customElements.define(CollapsibleMenu.element, CollapsibleMenu)

declare global {
  interface HTMLElementTagNameMap {
    [CollapsibleMenu.element]: CollapsibleMenu
  }
}
