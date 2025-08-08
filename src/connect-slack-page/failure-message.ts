import * as StatusCodes from '../StatusCodes.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'connect-slack-page', 'havingProblems')()),
    status: StatusCodes.ServiceUnavailable,
    main: html`
      <h1>${translate(locale, 'connect-slack-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'connect-slack-page', 'unableToConnect')()}</p>

      <p>${translate(locale, 'connect-slack-page', 'tryAgainLater')()}</p>
    `,
  })
