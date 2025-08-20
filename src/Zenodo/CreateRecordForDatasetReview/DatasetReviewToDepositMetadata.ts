import { Match, Option, pipe } from 'effect'
import type * as Events from '../../Events.js'
import { html } from '../../html.js'
import { Doi } from '../../types/index.js'
import type { DepositMetadata } from '../Deposition.js'

export interface DatasetReview {
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
  readonly answerToIfTheDatasetHasEnoughMetadata: Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']>
}

export const DatasetReviewToDepositMetadata = (review: DatasetReview): DepositMetadata => ({
  creators: [{ name: 'A PREreviewer' }],
  description: html`
    <dl>
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
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
      ${Option.match(review.answerToIfTheDatasetHasEnoughMetadata, {
        onNone: () => '',
        onSome: answerToIfTheDatasetHasEnoughMetadata => html`
          <dt>Does the dataset have enough metadata?</dt>
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
        `,
      })}
    </dl>
  `,
  title: 'Dataset review',
  communities: [{ identifier: 'prereview-reviews' }],
  relatedIdentifiers: [
    {
      identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
      relation: 'reviews',
      resourceType: 'dataset',
      scheme: 'doi',
    },
  ],
  uploadType: 'publication',
  publicationType: 'peerreview',
})
