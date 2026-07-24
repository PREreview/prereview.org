import { html } from '../html.ts'
import type { SpotlightBanner } from '../SpotlightBanners/index.ts'

export const showSpotlightBanner = ({ id, title, description, callToAction }: SpotlightBanner) => html`
  <spotlight-banner data-spotlight-banner-id="${id}">
    <div>
      <h2>${title}</h2>
      <div>${description}</div>
    </div>
    <a href="${callToAction.url.href}" class="button">${callToAction.text}</a>
  </spotlight-banner>
`
