import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const createNoPermissionPage = (locale: SupportedLocale): PageResponse =>
  PageResponse({
    status: StatusCodes.FORBIDDEN,
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
