import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const removedPermanentlyPage = (locale: SupportedLocale) => {
  const t = translate(locale, 'legacy-routes')

  return PageResponse({
    title: plainText(t('permanentlyTitle')()),
    status: StatusCodes.Gone,
    main: html`
      <h1>${t('permanentlyTitle')()}</h1>

      <p>${t('permanentlyMessage')()}</p>

      <p>${t('getInTouch')({ link: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}</p>
    `,
  })
}
