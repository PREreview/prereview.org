import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.ServiceUnavailable,
    title: plainText(translate(locale, 'disconnect-slack-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'disconnect-slack-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'disconnect-slack-page', 'unableToDisconnect')()}</p>

      <p>${translate(locale, 'disconnect-slack-page', 'tryAgainLater')()}</p>
    `,
  })
