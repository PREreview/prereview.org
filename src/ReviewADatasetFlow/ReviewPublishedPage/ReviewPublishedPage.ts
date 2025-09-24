import { html, plainText } from '../../html.ts'
import { StreamlinePageResponse } from '../../response.ts'
import * as Routes from '../../routes.ts'
import type { Doi, Uuid } from '../../types/index.ts'

export const ReviewPublishedPage = ({ datasetReviewId, doi }: { datasetReviewId: Uuid.Uuid; doi: Doi.Doi }) => {
  return StreamlinePageResponse({
    title: plainText('PREreview published'),
    main: html`
      <div class="panel">
        <h1>PREreview published</h1>

        <div>
          Your DOI
          <div><strong class="doi" translate="no">${doi}</strong></div>
        </div>
      </div>

      <a href="${Routes.DatasetReview.href({ datasetReviewId })}" class="button">See your review</a>
    `,
    canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
  })
}
