import { html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createNoPermissionPage = (locale: SupportedLocale): PageResponse => {
  const t = translate(locale, 'no-permission-page')

  return PageResponse({
    status: StatusCodes.Forbidden,
    title: plainText(t('noPermissionTitle')()),
    main: html`
      <h1>${t('noPermissionTitle')()}</h1>

      <p>${t('shouldHaveAccess')({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}</p>
    `,
  })
}
