import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as _ from '../../src/DatasetReviewPage/DatasetReviewPage.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { html } from '../../src/html.ts'
import * as Personas from '../../src/Personas/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../src/types/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.createDatasetReviewPage({
    datasetReview,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReview: _.DatasetReview = {
  author: new Personas.PublicPersona({
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
  }),
  dataset: {
    id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
    title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
    language: 'en',
    url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
  },
  doi: Doi.Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  questions: {
    qualityRating: Option.some({
      rating: 'excellent',
      detail: NonEmptyString.fromString('Detail about the excellent rating.'),
    }),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    },
    answerToIfTheDatasetHasEnoughMetadata: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetHasTrackedChanges: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetSupportsRelatedConclusions: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetIsDetailedEnough: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetIsErrorFree: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetMattersToItsAudience: Option.some({
      answer: 'very-consequential',
      detail: NonEmptyString.fromString('Detail about the very-consequential.'),
    }),
    answerToIfTheDatasetIsReadyToBeShared: Option.some({
      answer: 'yes',
      detail: NonEmptyString.fromString('Detail about the yes.'),
    }),
    answerToIfTheDatasetIsMissingAnything: NonEmptyString.fromString(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    ),
  },
  competingInterests: NonEmptyString.fromString(
    'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
  ),
  published: Temporal.PlainDate.from('2025-08-06'),
}
