import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const removedMessage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.Gone,
    title: plainText(translate(locale, 'review-page', 'prereviewRemoved')()),
    main: html`
      <h1>${translate(locale, 'review-page', 'prereviewRemoved')()}</h1>

      <p>${translate(locale, 'review-page', 'weHaveRemoved')()}</p>
    `,
  })
