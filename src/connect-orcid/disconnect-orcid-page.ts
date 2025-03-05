import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { disconnectOrcidMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const disconnectOrcidPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText`Disconnect your ORCID profile`,
    main: html`
      <form method="post" action="${format(disconnectOrcidMatch.formatter, {})}" novalidate>
        <h1>Disconnect your ORCID profile</h1>

        <p>You can disconnect your PREreview profile from your ORCID profile.</p>

        <p>We’ll stop adding new PREreviews to your ORCID profile.</p>

        <p>You will be able to reconnect it at any time.</p>

        <button>Disconnect profile</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(disconnectOrcidMatch.formatter, {}),
  })
