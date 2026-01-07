import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { PageResponse } from '../../Response/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'reviews-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'reviews-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'reviews-page', 'unableToShow')()}</p>

      <p>${translate(locale, 'review-page', 'tryAgainLater')()}</p>
    `,
  })
