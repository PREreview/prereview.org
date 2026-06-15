import { Array, flow } from 'effect'
import { html, plainText, rawHtml, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import { ServerNames } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const NotAPreprintPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'notAPreprint')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'notAPreprint')()}</h1>

      <p>
        ${translate(
          locale,
          'request-a-prereview-page',
          'supportPreprintsFrom',
        )({ servers: formatList('en')(ServerNames) })}
      </p>

      <p>${translate(locale, 'request-a-prereview-page', 'isAPreprint')({ contact: mailToHelp })}</p>

      <a href="${Routes.RequestAReview}" class="button">${translate(locale, 'forms', 'backLink')()}</a>
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
