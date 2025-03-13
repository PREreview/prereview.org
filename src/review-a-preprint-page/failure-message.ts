import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.ServiceUnavailable,
    title: plainText(translate(locale, 'review-a-preprint', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'havingProblems')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'unableToPublishNow')()}</p>

      <p>${translate(locale, 'review-a-preprint', 'tryAgainLater')()}</p>
    `,
  })
