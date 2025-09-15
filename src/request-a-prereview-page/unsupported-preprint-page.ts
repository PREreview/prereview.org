import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import type { PreprintId } from '../Preprints/index.js'
import * as PreprintServers from '../PreprintServers/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'
import * as StatusCodes from '../StatusCodes.js'

export const unsupportedPreprintPage = (preprint: PreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'unsupportedPreprintTitle')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'unsupportedPreprintTitle')()}</h1>

      <p>
        ${translate(
          locale,
          'request-a-prereview-page',
          'unsupportedPreprintMessage',
        )({ server: PreprintServers.getName(preprint) })}
      </p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })
