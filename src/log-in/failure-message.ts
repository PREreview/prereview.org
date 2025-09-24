import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'log-in', 'havingProblems')()),
    status: StatusCodes.ServiceUnavailable,
    main: html`
      <h1>${translate(locale, 'log-in', 'havingProblems')()}</h1>

      <p>${translate(locale, 'log-in', 'unableToLogYouIn')()}</p>

      <p>${translate(locale, 'log-in', 'tryAgainLater')()}</p>
    `,
  })
