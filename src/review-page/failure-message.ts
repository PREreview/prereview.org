import * as StatusCodes from '../StatusCodes.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'review-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'review-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'review-page', 'unableToShow')()}</p>

      <p>${translate(locale, 'review-page', 'tryAgainLater')()}</p>
    `,
  })
