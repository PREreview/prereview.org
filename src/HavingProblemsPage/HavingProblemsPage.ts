import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as StatusCodes from '../StatusCodes.js'

export const createHavingProblemsPage = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'having-problems-page', 'havingProblemsTitle')()),
    main: html`
      <h1>${translate(locale, 'having-problems-page', 'havingProblemsTitle')()}</h1>

      <p>${translate(locale, 'having-problems-page', 'tryAgainLater')()}</p>
    `,
  })
