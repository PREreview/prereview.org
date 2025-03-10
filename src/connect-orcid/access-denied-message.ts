import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const accessDeniedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.Forbidden,
    title: plainText(translate(locale, 'connect-orcid', 'cannotConnectProfile')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'cannotConnectProfile')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'youDeniedAccess')()}</p>

      <p>${translate(locale, 'connect-orcid', 'tryAgain')()}</p>
    `,
  })
