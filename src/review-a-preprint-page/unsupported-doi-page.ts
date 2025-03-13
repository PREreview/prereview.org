import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'

export const unsupportedDoiPage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'unsupportedDoi')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'unsupportedDoi')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'supportPreprintsFrom')()}</p>

      <p>${rawHtml(translate(locale, 'review-a-preprint', 'doiIsForPreprint')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'review-a-preprint', 'back')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
