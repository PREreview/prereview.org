import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'

export const accessDeniedMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'connect-slack-page', 'cannotConnect')()),
    status: StatusCodes.Forbidden,
    main: html`
      <h1>${translate(locale, 'connect-slack-page', 'cannotConnect')()}</h1>

      <p>${translate(locale, 'connect-slack-page', 'youDeniedAccess')()}</p>

      <p>${translate(locale, 'connect-slack-page', 'tryAgain')()}</p>
    `,
  })
