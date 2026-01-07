import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'review-a-preprint', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'havingProblems')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'unableToPublishNow')()}</p>

      <p>${translate(locale, 'review-a-preprint', 'tryAgainLater')()}</p>
    `,
  })
