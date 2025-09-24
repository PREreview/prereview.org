import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'

export const accessDeniedMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'log-in', 'cannotLogYouIn')()),
    status: StatusCodes.Forbidden,
    main: html`
      <h1>${translate(locale, 'log-in', 'cannotLogYouIn')()}</h1>

      <p>${translate(locale, 'log-in', 'youDeniedAccess')()}</p>

      <p>${translate(locale, 'log-in', 'tryAgain')()}</p>
    `,
  })
