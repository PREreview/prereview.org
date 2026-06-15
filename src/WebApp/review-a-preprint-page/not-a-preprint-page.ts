import { Array, flow } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { ServerNames } from '../../Preprints/index.ts'
import { reviewAPreprintMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const notAPreprintPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'notAPreprint')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'notAPreprint')()}</h1>

      <p>
        ${translate(locale, 'review-a-preprint', 'supportPreprintsFrom')({ servers: formatList('en')(ServerNames) })}
      </p>

      <p>${translate(locale, 'review-a-preprint', 'isAPreprint')({ contact: mailToHelp })}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: Html) => html`<a href="mailto:help@prereview.org">${text}</a>`

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
