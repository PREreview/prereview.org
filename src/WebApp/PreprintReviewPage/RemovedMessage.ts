import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createRemovedMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'review-page')

  return PageResponse({
    status: StatusCodes.Gone,
    title: plainText(t('prereviewRemoved')()),
    main: html`
      <h1>${t('prereviewRemoved')()}</h1>

      <p>${t('weHaveRemoved')()}</p>
    `,
  })
}
