import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { connectOrcidMatch, connectOrcidStartMatch } from '../routes.js'

export const connectOrcidPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'connect-orcid', 'connectOrcidRecord')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'connectOrcidRecord')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'canConnect')()}</p>

      <p>${translate(locale, 'connect-orcid', 'willAddPrereviews')()}</p>

      <h2>${translate(locale, 'connect-orcid', 'beforeYouStart')()}</h2>

      <p>${translate(locale, 'connect-orcid', 'sendYouToOrcid')()}</p>

      <a href="${format(connectOrcidStartMatch.formatter, {})}" role="button" draggable="false"
        >${translate(locale, 'connect-orcid', 'startNow')()}</a
      >
    `,
    canonical: format(connectOrcidMatch.formatter, {}),
  })
