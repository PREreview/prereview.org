import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import { disconnectSlackMatch } from '../routes.ts'

export const disconnectSlackPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'disconnect-slack-page', 'disconnectSlackAccount')()),
    main: html`
      <form method="post" action="${format(disconnectSlackMatch.formatter, {})}" novalidate>
        <h1>${translate(locale, 'disconnect-slack-page', 'disconnectSlackAccount')()}</h1>

        <p>${translate(locale, 'disconnect-slack-page', 'youCanDisconnect')()}</p>

        <p>${translate(locale, 'disconnect-slack-page', 'removeOrcidId')()}</p>

        <p>${translate(locale, 'disconnect-slack-page', 'canReconnect')()}</p>

        <button>${translate(locale, 'disconnect-slack-page', 'disconnectAccountButton')()}</button>
      </form>
    `,
    canonical: format(disconnectSlackMatch.formatter, {}),
  })
