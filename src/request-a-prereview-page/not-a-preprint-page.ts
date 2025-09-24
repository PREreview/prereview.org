import { format } from 'fp-ts-routing'
import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText, rawHtml } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { requestAPrereviewMatch } from '../routes.ts'

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
