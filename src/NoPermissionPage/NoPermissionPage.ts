import { html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as StatusCodes from '../StatusCodes.ts'

export const createNoPermissionPage = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.Forbidden,
    title: plainText(translate(locale, 'no-permission-page', 'noPermissionTitle')()),
    main: html`
      <h1>${translate(locale, 'no-permission-page', 'noPermissionTitle')()}</h1>

      <p>
        ${rawHtml(
          translate(
            locale,
            'no-permission-page',
            'shouldHaveAccess',
          )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>
    `,
  })
