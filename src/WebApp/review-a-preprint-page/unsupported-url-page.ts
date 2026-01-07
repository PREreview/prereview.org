import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { PageResponse } from '../../Response/index.ts'
import { reviewAPreprintMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'

export const unsupportedUrlPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'unsupportedUrl')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'unsupportedUrl')()}</h1>

      <p>${translate(locale, 'review-a-preprint', 'supportPreprintsFrom')()}</p>

      <p>${rawHtml(translate(locale, 'review-a-preprint', 'urlIsForPreprint')({ contact: mailToHelp }))}</p>

      <p>${translate(locale, 'review-a-preprint', 'otherwiseUseDoi')()}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
