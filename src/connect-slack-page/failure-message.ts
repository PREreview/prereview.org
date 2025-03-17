import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const failureMessage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText`Sorry, we’re having problems`,
    status: Status.ServiceUnavailable,
    main: html`
      <h1>Sorry, we’re having problems</h1>

      <p>We’re unable to connect your account right now.</p>

      <p>Please try again later.</p>
    `,
  })
