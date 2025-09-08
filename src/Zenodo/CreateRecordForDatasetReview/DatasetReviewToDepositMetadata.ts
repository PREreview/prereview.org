import { Match, Option, pipe } from 'effect'
import type * as Events from '../../Events.js'
import { html } from '../../html.js'
import { Doi, type NonEmptyString, type Orcid } from '../../types/index.js'
import type { DepositMetadata } from '../Deposition.js'

export interface DatasetReview {
  readonly author: {
    name: NonEmptyString.NonEmptyString
    orcidId?: Orcid.Orcid
  }
  readonly qualityRating: Option.Option<Events.RatedTheQualityOfTheDataset['rating']>
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
  readonly answerToIfTheDatasetHasEnoughMetadata: Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']>
  readonly answerToIfTheDatasetHasTrackedChanges: Option.Option<Events.AnsweredIfTheDatasetHasTrackedChanges['answer']>
  readonly answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<
    Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted['answer']
  >
  readonly answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch['answer']
  >
  readonly answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch['answer']
  >
  readonly answerToIfTheDatasetIsDetailedEnough: Option.Option<Events.AnsweredIfTheDatasetIsDetailedEnough['answer']>
  readonly answerToIfTheDatasetIsErrorFree: Option.Option<Events.AnsweredIfTheDatasetIsErrorFree['answer']>
  readonly answerToIfTheDatasetMattersToItsAudience: Option.Option<
    Events.AnsweredIfTheDatasetMattersToItsAudience['answer']
  >
  readonly answerToIfTheDatasetIsReadyToBeShared: Option.Option<Events.AnsweredIfTheDatasetIsReadyToBeShared['answer']>
  readonly answerToIfTheDatasetIsMissingAnything: Events.AnsweredIfTheDatasetIsMissingAnything['answer']
}

export const DatasetReviewToDepositMetadata = (review: DatasetReview): DepositMetadata => ({
  creators: [{ name: review.author.name, orcid: review.author.orcidId }],
  description: html`
    <dl>
      ${Option.match(review.qualityRating, {
        onNone: () => '',
        onSome: qualityRating => html`
          <dt>How would you rate the quality of this data set?</dt>
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
        `,
      })}
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
      ${Option.match(review.answerToIfTheDatasetHasTrackedChanges, {
        onNone: () => '',
        onSome: answerToIfTheDatasetHasTrackedChanges => html`
          <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetHasDataCensoredOrDeleted, {
        onNone: () => '',
        onSome: answerToIfTheDatasetHasDataCensoredOrDeleted => html`
          <dt>
            Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
            deletion, or redaction, that are not accounted for otherwise?
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
        onNone: () => '',
        onSome: answerToIfTheDatasetIsAppropriateForThisKindOfResearch => html`
          <dt>Is the dataset well-suited to support its stated research purpose?</dt>
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetSupportsRelatedConclusions, {
        onNone: () => '',
        onSome: answerToIfTheDatasetSupportsRelatedConclusions => html`
          <dt>Does this dataset support the researcher’s stated conclusions?</dt>
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetIsDetailedEnough, {
        onNone: () => '',
        onSome: answerToIfTheDatasetIsDetailedEnough => html`
          <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetIsErrorFree, {
        onNone: () => '',
        onSome: answerToIfTheDatasetIsErrorFree => html`
          <dt>Is the dataset relatively error-free?</dt>
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetMattersToItsAudience, {
        onNone: () => '',
        onSome: answerToIfTheDatasetMattersToItsAudience => html`
          <dt>
            Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
            researchers, or to the general public? How consequential is it likely to seem to that audience or those
            audiences?
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
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetIsReadyToBeShared, {
        onNone: () => '',
        onSome: answerToIfTheDatasetIsReadyToBeShared => html`
          <dt>Is this dataset ready to be shared?</dt>
          <dd>
            ${pipe(
              Match.value(answerToIfTheDatasetIsReadyToBeShared),
              Match.when('yes', () => 'Yes'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
              Match.exhaustive,
            )}
          </dd>
        `,
      })}
      ${Option.match(review.answerToIfTheDatasetIsMissingAnything, {
        onNone: () => '',
        onSome: answerToIfTheDatasetIsMissingAnything => html`
          <dt>
            What else, if anything, would it be helpful for the researcher to include with this dataset to make it
            easier to find, understand and reuse in ethical and responsible ways?
          </dt>
          <dd>${answerToIfTheDatasetIsMissingAnything}</dd>
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
