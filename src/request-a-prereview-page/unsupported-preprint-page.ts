import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as PreprintServers from '../PreprintServers/index.ts'
import { PageResponse } from '../Response/index.ts'
import { requestAPrereviewMatch } from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'

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
