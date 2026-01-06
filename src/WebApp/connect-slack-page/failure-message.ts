import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { PageResponse } from '../../Response/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'

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
