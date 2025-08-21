import { Match, Option, pipe } from 'effect'
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
    nav: html`
      <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.ReviewADatasetCheckYourReview.href({ datasetReviewId })}" novalidate>
          <h1>Check your PREreview</h1>

          <div class="summary-card">
            <div>
              <h2>Dataset details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>Title</span></dt>
                <dd>
                  <cite>Metadata collected from 500 articles in the field of ecology and evolution</cite>
                </dd>
              </div>
              <div>
                <dt><span>Repository</span></dt>
                <dd>Dryad</dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2 id="review-label">Your review</h2>
            </div>

            <div aria-labelledby="review-label" role="region">
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
                  <dd>
                    <a href="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}">
                      Change <span class="visually-hidden">if the dataset follows FAIR and CARE principles</span>
                    </a>
                  </dd>
                </div>
                ${Option.match(review.answerToIfTheDatasetHasEnoughMetadata, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetHasEnoughMetadata => html`
                    <div>
                      <dt><span>Does the dataset have enough metadata?</span></dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetHasEnoughMetadata),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset has enough metadata</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
              </dl>
            </div>
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
