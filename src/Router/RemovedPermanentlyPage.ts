import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as StatusCodes from '../StatusCodes.js'

export const removedPermanentlyPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'legacy-routes', 'permanentlyTitle')()),
    status: StatusCodes.Gone,
    main: html`
      <h1>${translate(locale, 'legacy-routes', 'permanentlyTitle')()}</h1>

      <p>${translate(locale, 'legacy-routes', 'permanentlyMessage')()}</p>

      <p>
        ${rawHtml(
          translate(
            locale,
            'legacy-routes',
            'getInTouch',
          )({ link: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>
    `,
  })
