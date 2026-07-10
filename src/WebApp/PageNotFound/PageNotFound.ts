import { html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export function createPageNotFound(locale: SupportedLocale): PageResponse {
  const t = translate(locale, 'page-not-found')

  return PageResponse({
    status: StatusCodes.NotFound,
    title: plainText(t('pageNotFoundTitle')()),
    main: html`
      <h1>${t('pageNotFoundTitle')()}</h1>

      <p>${t('checkCorrect')()}</p>

      <p>${t('checkEntire')()}</p>

      <p>${t('contactUs')({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}</p>
    `,
  })
}
