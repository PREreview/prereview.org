import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const accessDeniedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.Forbidden,
    title: plainText`Sorry, we can’t connect your profile`,
    main: html`
      <h1>Sorry, we can’t connect your profile</h1>

      <p>You have denied PREreview access to your ORCID profile.</p>

      <p>Please try again.</p>
    `,
  })
