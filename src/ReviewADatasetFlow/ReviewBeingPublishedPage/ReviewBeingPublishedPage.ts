import { html, plainText } from '../../html.ts'
import { StreamlinePageResponse } from '../../response.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'

export const ReviewBeingPublishedPage = ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) => {
  return StreamlinePageResponse({
    title: plainText('We’re publishing your PREreview'),
    main: html`
      <h1>We’re publishing your PREreview</h1>

      <poll-redirect>
        <div>
          <p>You’ll be able to see your PREreview shortly.</p>

          <a href="${Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId })}" class="button"
            >Reload page</a
          >
        </div>

        <div hidden class="loading">
          <p>You’ll be able to see your PREreview shortly.</p>
        </div>

        <div hidden>
          <a href="${Routes.ReviewADatasetReviewPublished.href({ datasetReviewId })}" class="button">Continue</a>
        </div>
      </poll-redirect>
    `,
    canonical: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
    js: ['poll-redirect.js'],
  })
}
