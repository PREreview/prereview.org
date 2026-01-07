import { html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createPageNotFound = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.NotFound,
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
