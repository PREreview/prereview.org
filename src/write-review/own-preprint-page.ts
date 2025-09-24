import { format, type Formatter } from 'fp-ts-routing'
import type { IndeterminatePreprintId, PreprintId } from '../Preprints/index.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { html, plainText, rawHtml } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { preprintReviewsMatch } from '../routes.ts'

export const ownPreprintPage = (
  preprint: PreprintId,
  canonical: Formatter<{ id: IndeterminatePreprintId }>,
  locale: SupportedLocale,
) =>
  PageResponse({
    status: StatusCodes.Forbidden,
    title: plainText(translate(locale, 'write-review', 'ownPreprint')()),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back"
        ><span>${translate(locale, 'write-review', 'backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-review', 'ownPreprint')()}</h1>

      <p>${rawHtml(translate(locale, 'write-review', 'ifNotAuthor')({ contact: mailToHelp }))}</p>
    `,
    canonical: format(canonical, { id: preprint }),
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
