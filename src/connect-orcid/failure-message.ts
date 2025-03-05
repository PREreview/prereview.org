import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const connectFailureMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.ServiceUnavailable,
    title: plainText(translate(locale, 'connect-orcid', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'connect-orcid', 'havingProblems')()}</h1>

      <p>${translate(locale, 'connect-orcid', 'unableToConnect')()}</p>

      <p>${translate(locale, 'connect-orcid', 'tryAgainLater')()}</p>
    `,
  })

export const disconnectFailureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to disconnect your profile right now.</p>

    <p>Please try again later.</p>
  `,
})
