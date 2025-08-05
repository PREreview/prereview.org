import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Doi, Uuid } from '../../types/index.js'

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
    `,
    canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
  })
}
