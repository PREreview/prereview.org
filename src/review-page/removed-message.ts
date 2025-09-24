import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'

export const removedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.Gone,
    title: plainText(translate(locale, 'review-page', 'prereviewRemoved')()),
    main: html`
      <h1>${translate(locale, 'review-page', 'prereviewRemoved')()}</h1>

      <p>${translate(locale, 'review-page', 'weHaveRemoved')()}</p>
    `,
  })
