import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { requestAPrereviewMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const notAPreprintPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'notAPreprint')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'notAPreprint')()}</h1>

      <p>${translate(locale, 'request-a-prereview-page', 'supportPreprintsFrom')()}</p>

      <p>${rawHtml(translate(locale, 'request-a-prereview-page', 'isAPreprint')({ contact: mailToHelp }))}</p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
