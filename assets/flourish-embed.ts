export class FlourishEmbed extends HTMLElement {
  static element = 'flourish-embed' as const
}

window.customElements.define(FlourishEmbed.element, FlourishEmbed)

declare global {
  interface HTMLElementTagNameMap {
    [FlourishEmbed.element]: FlourishEmbed
  }
}
