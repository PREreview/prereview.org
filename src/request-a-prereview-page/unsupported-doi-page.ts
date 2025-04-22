import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'

export const unsupportedDoiPage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'unsupportedDoiTitle')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'unsupportedDoiTitle')()}</h1>

      <p>${translate(locale, 'request-a-prereview-page', 'supportPreprintsFrom')()}</p>

      <p>
        ${rawHtml(
          translate(
            locale,
            'request-a-prereview-page',
            'doiContactUs',
          )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })
