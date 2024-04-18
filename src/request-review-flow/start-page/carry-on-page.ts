import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import type { ReviewRequestPreprintId } from '../../review-request'
import { preprintReviewsMatch, requestReviewCheckMatch, requestReviewStartMatch } from '../../routes'

export const carryOnPage = (preprint: ReviewRequestPreprintId) =>
  StreamlinePageResponse({
    title: plainText`Request a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Request a PREreview</h1>

      <p>As you’ve already started, we’ll take you to the next step so you can carry&nbsp;on.</p>

      <a href="${format(requestReviewCheckMatch.formatter, {})}" role="button" draggable="false">Continue</a>
    `,
    canonical: format(requestReviewStartMatch.formatter, {}),
  })
