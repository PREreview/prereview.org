import * as StatusCodes from '../StatusCodes.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

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
