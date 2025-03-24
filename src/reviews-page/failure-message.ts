import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.ServiceUnavailable,
    title: plainText(translate(locale, 'reviews-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'reviews-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'reviews-page', 'unableToShow')()}</p>

      <p>${translate(locale, 'review-page', 'tryAgainLater')()}</p>
    `,
  })
