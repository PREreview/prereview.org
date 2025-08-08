import { format } from 'fp-ts-routing'
import * as StatusCodes from '../StatusCodes.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'

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
