import { html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const removedForNowPage = (locale: SupportedLocale) => {
  const t = translate(locale, 'legacy-routes')

  return PageResponse({
    title: plainText(t('temporaryTitle')()),
    status: StatusCodes.NotFound,
    main: html`
      <h1>${t('temporaryTitle')()}</h1>

      <p>${t('temporaryMessage')()}</p>

      <p>${t('getInTouch')({ link: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}</p>
    `,
  })
}
