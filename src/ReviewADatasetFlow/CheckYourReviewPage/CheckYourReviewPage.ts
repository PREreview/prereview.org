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
      <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}" class="back"><span>Back</span></a>
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
                ${Option.match(review.qualityRating, {
                  onNone: () => '',
                  onSome: qualityRating => html`
                    <div>
                      <dt><span>How would you rate the quality of this data set?</span></dt>
                      <dd>
                        ${pipe(
                          Match.value(qualityRating),
                          Match.when('excellent', () => 'Excellent'),
                          Match.when('fair', () => 'Fair'),
                          Match.when('poor', () => 'Poor'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">how you rate the quality</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
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
                ${Option.match(review.answerToIfTheDatasetHasTrackedChanges, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetHasTrackedChanges => html`
                    <div>
                      <dt>
                        <span
                          >Does this dataset include a way to list or track changes or versions? If so, does it seem
                          accurate?</span
                        >
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetHasTrackedChanges),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}">
                          Change
                          <span class="visually-hidden"
                            >if the dataset includes a way to list or track changes or versions</span
                          >
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetHasDataCensoredOrDeleted, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetHasDataCensoredOrDeleted => html`
                    <div>
                      <dt>
                        <span
                          >Does this dataset show signs of alteration beyond instances of likely human error, such as
                          censorship, deletion, or redaction, that are not accounted for otherwise?</span
                        >
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetHasDataCensoredOrDeleted),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset shows signs of alteration</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsAppropriateForThisKindOfResearch => html`
                    <div>
                      <dt>
                        <span>Is the dataset well-suited to support its stated research purpose?</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetIsAppropriateForThisKindOfResearch),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset is well-suited</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetSupportsRelatedConclusions, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetSupportsRelatedConclusions => html`
                    <div>
                      <dt>
                        <span>Does this dataset support the researcher’s stated conclusions?</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetSupportsRelatedConclusions),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset supports the conclusions</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsDetailedEnough, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsDetailedEnough => html`
                    <div>
                      <dt>
                        <span>Is the dataset granular enough to be a reliable standard of measurement?</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetIsDetailedEnough),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset is granular enough</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsErrorFree, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsErrorFree => html`
                    <div>
                      <dt>
                        <span>Is the dataset relatively error-free?</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetIsErrorFree),
                          Match.when('yes', () => 'Yes'),
                          Match.when('partly', () => 'Partly'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset is relatively error-free</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetMattersToItsAudience, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetMattersToItsAudience => html`
                    <div>
                      <dt>
                        <span
                          >Is this dataset likely to be of interest to researchers in its corresponding field of study,
                          to most researchers, or to the general public? How consequential is it likely to seem to that
                          audience or those audiences?</span
                        >
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetMattersToItsAudience),
                          Match.when('very-consequential', () => 'Very consequential'),
                          Match.when('somewhat-consequential', () => 'Somewhat consequential'),
                          Match.when('not-consequential', () => 'Not consequential'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">how consequential the dataset is likely to seem</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsReadyToBeShared, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsReadyToBeShared => html`
                    <div>
                      <dt>
                        <span>Is this dataset ready to be shared?</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answerToIfTheDatasetIsReadyToBeShared),
                          Match.when('yes', () => 'Yes'),
                          Match.when('no', () => 'No'),
                          Match.when('unsure', () => 'I don’t know'),
                          Match.exhaustive,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset is ready to be shared</span>
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsMissingAnything, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsMissingAnything => html`
                    <div>
                      <dt>
                        <span
                          >What else, if anything, would it be helpful for the researcher to include with this dataset
                          to make it easier to find, understand and reuse in ethical and responsible ways?
                        </span>
                      </dt>
                      <dd>${Option.getOrElse(answerToIfTheDatasetIsMissingAnything, () => html`<i>No answer</i>`)}</dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}">
                          Change <span class="visually-hidden">if the dataset is missing anything</span>
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
