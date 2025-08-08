import * as StatusCodes from '../StatusCodes.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'preprint-reviews', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'preprint-reviews', 'havingProblems')()}</h1>

      <p>${translate(locale, 'preprint-reviews', 'unableToShow')()}</p>

      <p>${translate(locale, 'preprint-reviews', 'tryAgainLater')()}</p>
    `,
  })
