import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import type { ReviewRequestPreprintId } from '../../review-request.js'
import { requestReviewPublishedMatch, reviewRequestsMatch } from '../../routes.js'

export const publishedPage = (preprint: ReviewRequestPreprintId) =>
  StreamlinePageResponse({
    title: plainText`Request published`,
    main: html`
      <div class="panel">
        <h1>Request published</h1>
      </div>

      <h2>What happens next</h2>

      <p>
        You’ll be able to see your request on our
        <a href="${format(reviewRequestsMatch.formatter, {})}">list of requests</a> and
        <a href="https://bit.ly/PREreview-Slack">Community Slack</a> shortly.
      </p>
    `,
    canonical: format(requestReviewPublishedMatch.formatter, { id: preprint }),
  })
