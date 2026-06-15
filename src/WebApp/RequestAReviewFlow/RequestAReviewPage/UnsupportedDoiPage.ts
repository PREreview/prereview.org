import { Array, flow } from 'effect'
import { type Html, html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import { ServerNames } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const UnsupportedDoiPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'unsupportedDoiTitle')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'unsupportedDoiTitle')()}</h1>

      <p>
        ${translate(
          locale,
          'request-a-prereview-page',
          'supportPreprintsFrom',
        )({ servers: formatList(locale)(ServerNames) })}
      </p>

      <p>
        ${translate(
          locale,
          'request-a-prereview-page',
          'doiContactUs',
        )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}
      </p>

      <a href="${Routes.RequestAReview}" class="button">${translate(locale, 'forms', 'backLink')()}</a>
    `,
  })

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`<bdi>${item}</bdi>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
