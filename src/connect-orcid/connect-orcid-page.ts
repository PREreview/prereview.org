import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import { connectOrcidMatch, connectOrcidStartMatch } from '../routes.ts'

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
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: format(connectOrcidMatch.formatter, {}),
  })
