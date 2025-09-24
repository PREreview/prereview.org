import { format } from 'fp-ts-routing'
import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText, rawHtml } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { reviewAPreprintMatch } from '../routes.ts'

export const notAPreprintPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'notAPreprint')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'notAPreprint')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'supportPreprintsFrom')()}</p>

      <p>${rawHtml(translate(locale, 'review-a-preprint', 'isAPreprint')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
