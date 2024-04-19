import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import type { ReviewRequestPreprintId } from '../../review-request'
import { requestReviewPublishedMatch } from '../../routes'

export const publishedPage = (preprint: ReviewRequestPreprintId) =>
  StreamlinePageResponse({
    title: plainText`Request published`,
    main: html`
      <div class="panel">
        <h1>Request published</h1>
      </div>

      <h2>What happens next</h2>

      <p>
        You’ll be able to see your request on our <a href="https://bit.ly/PREreview-Slack">Community Slack</a> shortly.
      </p>
    `,
    canonical: format(requestReviewPublishedMatch.formatter, { id: preprint }),
  })
