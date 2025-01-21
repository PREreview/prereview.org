import { type Formatter, format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { preprintReviewsMatch } from '../routes.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

export const ownPreprintPage = (preprint: PreprintId, canonical: Formatter<{ id: IndeterminatePreprintId }>) =>
  PageResponse({
    status: Status.Forbidden,
    title: plainText`Sorry, you can’t review your own preprint`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back"
        ><span>Back to preprint</span></a
      >
    `,
    main: html`
      <h1>Sorry, you can’t review your own preprint</h1>

      <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
    `,
    canonical: format(canonical, { id: preprint }),
  })
