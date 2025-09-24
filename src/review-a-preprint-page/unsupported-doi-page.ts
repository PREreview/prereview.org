import { format } from 'fp-ts-routing'
import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText, rawHtml } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { reviewAPreprintMatch } from '../routes.ts'

export const unsupportedDoiPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'unsupportedDoi')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'unsupportedDoi')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'supportPreprintsFrom')()}</p>

      <p>${rawHtml(translate(locale, 'review-a-preprint', 'doiIsForPreprint')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
