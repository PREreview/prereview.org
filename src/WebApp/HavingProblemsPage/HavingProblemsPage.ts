import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createHavingProblemsPage = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'having-problems-page', 'havingProblemsTitle')()),
    main: html`
      <h1>${translate(locale, 'having-problems-page', 'havingProblemsTitle')()}</h1>

      <p>${translate(locale, 'having-problems-page', 'tryAgainLater')()}</p>
    `,
  })
