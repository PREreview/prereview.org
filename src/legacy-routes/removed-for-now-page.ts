import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'

export const removedForNowPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'legacy-routes')('temporaryTitle')()),
    status: Status.NotFound,
    main: html`
      <h1>${translate(locale, 'legacy-routes')('temporaryTitle')()}</h1>

      <p>${translate(locale, 'legacy-routes')('temporaryMessage')()}</p>

      <p>
        ${rawHtml(
          translate(locale, 'legacy-routes')('getInTouch')({
            link: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString(),
          }),
        )}
      </p>
    `,
  })
