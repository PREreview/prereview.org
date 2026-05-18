import { type Html, html } from '../html.ts'

interface SpotlightBanner {
  readonly title: Html
  readonly text: Html
  readonly cta: {
    readonly text: Html
    readonly link: URL
  }
}

export const showSpotlightBanner = ({ title, text, cta }: SpotlightBanner) => html`
  <spotlight-banner>
    <div>
      <h2>${title}</h2>
      <div>${text}</div>
    </div>
    <a href="${cta.link.href}" class="button">${cta.text}</a>
  </spotlight-banner>
`
