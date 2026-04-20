import { Match, Option, pipe } from 'effect'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type * as Datasets from '../../../Datasets/index.ts'
import type { Zenodo } from '../../../ExternalApis/index.ts'
import { html, plainText } from '../../../html.ts'
import { DefaultLocale, translate } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'

export type DatasetReview = Omit<DatasetReviews.DataForZenodoRecord, 'author' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly dataset: Datasets.DatasetTitle
  readonly url: URL
}

export const DatasetReviewToDepositMetadata = (review: DatasetReview): Zenodo.DepositMetadata => {
  const t = translate(DefaultLocale, 'dataset-review-page')

  return {
    creators: [
      Personas.match(review.author, {
        onPublic: author => ({ name: author.name, orcid: author.orcidId }),
        onPseudonym: author => ({ name: author.pseudonym }),
      }),
    ],
    description: html`
      <dl>
        ${Option.match(review.qualityRating, {
          onNone: () => '',
          onSome: ({ rating, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'rateQuality')()}</dt>
            <dd>
              ${pipe(
                Match.value(rating),
                Match.when('excellent', () => t('review-a-dataset-flow', 'excellent')()),
                Match.when('fair', () => t('review-a-dataset-flow', 'fair')()),
                Match.when('poor', () => t('review-a-dataset-flow', 'poor')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        <dt>${t('review-a-dataset-flow', 'followFairAndCare')()}</dt>
        <dd>
          ${pipe(
            Match.value(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer),
            Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
            Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
            Match.when('no', () => t('review-a-dataset-flow', 'no')()),
            Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
            Match.exhaustive,
          )}
        </dd>
        ${Option.match(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.detail, {
          onNone: () => '',
          onSome: detail => html`<dd>${detail}</dd>`,
        })}
        ${Option.match(review.answerToIfTheDatasetHasEnoughMetadata, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'enoughMetadata')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetHasTrackedChanges, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'trackChanges')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetHasDataCensoredOrDeleted, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'signsOfAlteration')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'suitedForPurpose')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetSupportsRelatedConclusions, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'supportsConclusion')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetIsDetailedEnough, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'granularEnough')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetIsErrorFree, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'relativelyErrorFree')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetMattersToItsAudience, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'howConsequential')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('very-consequential', () => t('review-a-dataset-flow', 'veryConsequential')()),
                Match.when('somewhat-consequential', () => t('review-a-dataset-flow', 'somewhatConsequential')()),
                Match.when('not-consequential', () => t('review-a-dataset-flow', 'notConsequential')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetIsReadyToBeShared, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'readyToBeShared')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(review.answerToIfTheDatasetIsMissingAnything, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsMissingAnything => html`
            <dt>${t('review-a-dataset-flow', 'anythingMissing')()}</dt>
            <dd>${answerToIfTheDatasetIsMissingAnything}</dd>
          `,
        })}
      </dl>

      <h2>${t('competingInterests')()}</h2>

      <p>${Option.getOrElse(review.competingInterests, () => t('noCompetingInterestsStatement')())}</p>
    `,
    title: plainText(t('structuredReviewTitle')({ dataset: plainText`“${review.dataset.title}”`.toString() })),
    communities: [{ identifier: 'prereview-reviews' }],
    relatedIdentifiers: [
      {
        identifier: review.dataset.id.value,
        relation: 'reviews',
        resourceType: 'dataset',
        scheme: 'doi',
      },
      {
        identifier: review.url,
        relation: 'isIdenticalTo',
        resourceType: 'publication-peerreview',
        scheme: 'url',
      },
    ],
    uploadType: 'publication',
    publicationType: 'peerreview',
  }
}
