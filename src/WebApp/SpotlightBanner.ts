import { html } from '../html.ts'
import type { SpotlightBanner } from '../SpotlightBanners/index.ts'

export const showSpotlightBanner = ({ title, description, callToAction }: Omit<SpotlightBanner, 'id'>) => html`
  <spotlight-banner>
    <div>
      <h2>${title}</h2>
      <div>${description}</div>
    </div>
    <a href="${callToAction.url.href}" class="button">${callToAction.text}</a>
  </spotlight-banner>
`
