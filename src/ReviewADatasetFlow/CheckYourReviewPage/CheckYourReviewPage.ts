import { Match, pipe } from 'effect'
import type * as DatasetReviews from '../../DatasetReviews/index.js'
import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/uuid.js'

export const CheckYourReviewPage = ({
  datasetReviewId,
  review,
}: {
  datasetReviewId: Uuid
  review: DatasetReviews.DatasetReviewPreview
}) => {
  return StreamlinePageResponse({
    title: plainText('Check your PREreview'),
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.ReviewADatasetCheckYourReview.href({ datasetReviewId })}" novalidate>
          <h1>Check your PREreview</h1>

          <div class="summary-card">
            <div>
              <h2 id="review-label">Your review</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>Does this dataset follow FAIR and CARE principles?</span></dt>
                <dd>
                  ${pipe(
                    Match.value(review.answerToIfTheDatasetFollowsFairAndCarePrinciples),
                    Match.when('yes', () => 'Yes'),
                    Match.when('partly', () => 'Partly'),
                    Match.when('no', () => 'No'),
                    Match.when('unsure', () => 'I don’t know'),
                    Match.exhaustive,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <h2>Now publish your PREreview</h2>

          <button>Publish PREreview</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}
