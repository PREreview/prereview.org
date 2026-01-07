import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const accessDeniedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.Forbidden,
    title: plainText(translate(locale, 'connect-orcid', 'cannotConnectRecord')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'cannotConnectRecord')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'youDeniedAccess')()}</p>

      <p>${translate(locale, 'connect-orcid', 'tryAgain')()}</p>
    `,
  })
