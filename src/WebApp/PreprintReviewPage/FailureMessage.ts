import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createFailureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'review-page')

  return PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(t('havingProblems')()),
    main: html`
      <h1>${t('havingProblems')()}</h1>

      <p>${t('unableToShow')()}</p>

      <p>${t('tryAgainLater')()}</p>
    `,
  })
}
