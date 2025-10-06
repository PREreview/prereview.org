import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import { disconnectOrcidMatch } from '../routes.ts'

export const disconnectOrcidPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'connect-orcid', 'disconnectOrcidRecord')()),
    main: html`
      <form method="post" action="${format(disconnectOrcidMatch.formatter, {})}" novalidate>
        <h1>${translate(locale, 'connect-orcid', 'disconnectOrcidRecord')()}</h1>

        <p>${translate(locale, 'connect-orcid', 'canDisconnect')()}</p>

        <p>${translate(locale, 'connect-orcid', 'stopAddingPrereviews')()}</p>

        <p>${translate(locale, 'connect-orcid', 'canReconnect')()}</p>

        <button>${translate(locale, 'connect-orcid', 'disconnectRecordButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(disconnectOrcidMatch.formatter, {}),
  })
