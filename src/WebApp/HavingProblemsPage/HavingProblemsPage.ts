import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createHavingProblemsPage = (locale: SupportedLocale): PageResponse => {
  const t = translate(locale, 'having-problems-page')

  return PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(t('havingProblemsTitle')()),
    main: html`
      <h1>${t('havingProblemsTitle')()}</h1>

      <p>${t('tryAgainLater')()}</p>
    `,
  })
}
