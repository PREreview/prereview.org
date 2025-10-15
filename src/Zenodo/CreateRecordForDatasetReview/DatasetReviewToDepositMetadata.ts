import { Match, Option, pipe } from 'effect'
import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import type * as Datasets from '../../Datasets/index.ts'
import type { Zenodo } from '../../ExternalApis/index.ts'
import { html, plainText } from '../../html.ts'
import * as Personas from '../../Personas/index.ts'

export type DatasetReview = Omit<DatasetReviews.DataForZenodoRecord, 'author' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly dataset: Datasets.DatasetTitle
  readonly url: URL
}

export const DatasetReviewToDepositMetadata = (review: DatasetReview): Zenodo.DepositMetadata => ({
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
          <dt>How would you rate the quality of this data set?</dt>
          <dd>
            ${pipe(
              Match.value(rating),
              Match.when('excellent', () => 'Excellent'),
              Match.when('fair', () => 'Fair'),
              Match.when('poor', () => 'Poor'),
              Match.when('unsure', () => 'I don’t know'),
              Match.exhaustive,
            )}
          </dd>
          ${Option.match(detail, {
            onNone: () => '',
            onSome: detail => html`<dd>${detail}</dd>`,
          })}
        `,
      })}
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        ${pipe(
          Match.value(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer),
          Match.when('yes', () => 'Yes'),
          Match.when('partly', () => 'Partly'),
          Match.when('no', () => 'No'),
          Match.when('unsure', () => 'I don’t know'),
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
          <dt>Does the dataset have enough metadata?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>
            Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
            deletion, or redaction, that are not accounted for otherwise?
          </dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Is the dataset well-suited to support its stated research purpose?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Does this dataset support the researcher’s stated conclusions?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Is the dataset relatively error-free?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('partly', () => 'Partly'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>
            Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
            researchers, or to the general public? How consequential is it likely to seem to that audience or those
            audiences?
          </dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('very-consequential', () => 'Very consequential'),
              Match.when('somewhat-consequential', () => 'Somewhat consequential'),
              Match.when('not-consequential', () => 'Not consequential'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>Is this dataset ready to be shared?</dt>
          <dd>
            ${pipe(
              Match.value(answer),
              Match.when('yes', () => 'Yes'),
              Match.when('no', () => 'No'),
              Match.when('unsure', () => 'I don’t know'),
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
          <dt>
            What else, if anything, would it be helpful for the researcher to include with this dataset to make it
            easier to find, understand and reuse in ethical and responsible ways?
          </dt>
          <dd>${answerToIfTheDatasetIsMissingAnything}</dd>
        `,
      })}
    </dl>

    <h2>Competing interests</h2>

    <p>
      ${Option.getOrElse(review.competingInterests, () => 'The author declares that they have no competing interests.')}
    </p>
  `,
  title: `Structured PREreview of “${plainText(review.dataset.title).toString()}”`,
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
})
