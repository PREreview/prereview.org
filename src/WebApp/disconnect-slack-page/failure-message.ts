import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'disconnect-slack-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'disconnect-slack-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'disconnect-slack-page', 'unableToDisconnect')()}</p>

      <p>${translate(locale, 'disconnect-slack-page', 'tryAgainLater')()}</p>
    `,
  })
