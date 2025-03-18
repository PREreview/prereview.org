import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'log-in', 'havingProblems')()),
    status: Status.ServiceUnavailable,
    main: html`
      <h1>${translate(locale, 'log-in', 'havingProblems')()}</h1>

      <p>${translate(locale, 'log-in', 'unableToLogYouIn')()}</p>

      <p>${translate(locale, 'log-in', 'tryAgainLater')()}</p>
    `,
  })
