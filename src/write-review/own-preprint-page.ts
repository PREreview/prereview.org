import { format, type Formatter } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { preprintReviewsMatch } from '../routes.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

export const ownPreprintPage = (
  preprint: PreprintId,
  canonical: Formatter<{ id: IndeterminatePreprintId }>,
  locale: SupportedLocale,
) =>
  PageResponse({
    status: Status.Forbidden,
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
