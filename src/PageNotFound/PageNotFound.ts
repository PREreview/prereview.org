import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const createPageNotFound = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.NOT_FOUND,
    title: plainText(translate(locale, 'page-not-found', 'pageNotFoundTitle')()),
    main: html`
      <h1>${translate(locale, 'page-not-found', 'pageNotFoundTitle')()}</h1>

      <p>${translate(locale, 'page-not-found', 'checkCorrect')()}</p>

      <p>${translate(locale, 'page-not-found', 'checkEntire')()}</p>

      <p>
        ${rawHtml(
          translate(
            locale,
            'page-not-found',
            'contactUs',
          )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>
    `,
  })
