import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const removedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.Gone,
    title: plainText`PREreview removed`,
    main: html`
      <h1>PREreview removed</h1>

      <p>We’ve removed this PREreview.</p>
    `,
  })
