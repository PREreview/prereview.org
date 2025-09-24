import { html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import * as StatusCodes from '../StatusCodes.ts'

export const removedForNowPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'legacy-routes', 'temporaryTitle')()),
    status: StatusCodes.NotFound,
    main: html`
      <h1>${translate(locale, 'legacy-routes', 'temporaryTitle')()}</h1>

      <p>${translate(locale, 'legacy-routes', 'temporaryMessage')()}</p>

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
