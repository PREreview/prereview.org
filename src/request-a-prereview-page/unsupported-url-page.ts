import { format } from 'fp-ts-routing'
import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { requestAPrereviewMatch } from '../routes.ts'

export const unsupportedUrlPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'unsupportedUrlTitle')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'unsupportedUrlTitle')()}</h1>

      <p>${translate(locale, 'request-a-prereview-page', 'supportPreprintsFrom')()}</p>

      <p>
        ${rawHtml(
          translate(
            locale,
            'request-a-prereview-page',
            'urlContactUs',
          )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>

      <p>${translate(locale, 'request-a-prereview-page', 'tryDoi')()}</p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })
