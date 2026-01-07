import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const connectFailureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'connect-orcid', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'havingProblems')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'unableToConnect')()}</p>

      <p>${translate(locale, 'connect-orcid', 'tryAgainLater')()}</p>
    `,
  })

export const disconnectFailureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'connect-orcid', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'havingProblems')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'unableToDisconnect')()}</p>

      <p>${translate(locale, 'connect-orcid', 'tryAgainLater')()}</p>
    `,
  })
