import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import type { ReviewRequestPreprintId } from '../../review-request.js'
import { preprintReviewsMatch, requestReviewCheckMatch, requestReviewStartMatch } from '../../routes.js'

export const carryOnPage = (preprint: ReviewRequestPreprintId) =>
  StreamlinePageResponse({
    title: plainText`Request a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Request a PREreview</h1>

      <p>As you’ve already started, we’ll take you to the next step so you can carry&nbsp;on.</p>

      <a href="${format(requestReviewCheckMatch.formatter, { id: preprint })}" role="button" draggable="false"
        >Continue</a
      >
    `,
    canonical: format(requestReviewStartMatch.formatter, { id: preprint }),
  })
