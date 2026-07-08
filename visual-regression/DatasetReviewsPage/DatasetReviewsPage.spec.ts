import { Temporal } from '@js-temporal/polyfill'
import { Array, Option } from 'effect'
import * as Datasets from '../../src/Datasets/index.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import { Doi, NonEmptyString, OrcidId, Pseudonym, Uuid } from '../../src/types/index.ts'
import { Name } from '../../src/types/Name.ts'
import * as _ from '../../src/WebApp/DatasetReviewsPage/DatasetReviewsPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showTwoUpPage }) => {
  const response = _.createDatasetReviewsPage({
    dataset,
    datasetReviews: [prereview1, prereview2],
    locale: DefaultLocale,
  })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

test('content looks right when empty', async ({ showTwoUpPage }) => {
  const response = _.createDatasetReviewsPage({ dataset, datasetReviews: Array.empty(), locale: DefaultLocale })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

const dataset = new Datasets.Dataset({
  abstract: {
    text: html`
      <p>
        The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution.
        This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal
        Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset. These
        included the first and last names of authors. No more than three indirect identifiers have been provided.
        Information found herein includes article titles, number of authors and ECR status, among others. A README file
        has been attached to provide greater details about the dataset.
      </p>
    `,
    language: 'en',
  },
  authors: [
    { name: Name('Jesse Wolf') },
    { name: Name('Layla MacKay') },
    { name: Name('Sarah Haworth') },
    { name: Name('Morgan Dedato') },
    { name: Name('Kiana Young') },
    { name: Name('Marie-Laurence Cossette') },
    { name: Name('Colin Elliott') },
    { name: Name('Rebekah Oomen') },
  ],
  id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
  posted: Temporal.PlainDate.from('2022-09-02'),
  title: {
    text: html`Metadata collected from 500 articles in the field of ecology and evolution`,
    language: 'en',
  },
  url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
})

const prereview1: _.DatasetReview = {
  author: new Prereviewers.PublicPersona({
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    name: Name('Josiah Carberry'),
  }),
  otherAuthors: [],
  anonymousAuthors: 0,
  clubId: Option.some('4dbef4c4-3793-4a32-9837-3fa39a69188a'),
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
      detail: NonEmptyString.fromString('Detail about the yes.'),
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

const prereview2: _.DatasetReview = {
  author: new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
  otherAuthors: [
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      name: Name('Josiah Carberry'),
    }),
  ],
  anonymousAuthors: 1,
  clubId: Option.none(),
  doi: Doi.Doi('10.5281/zenodo.10779311'),
  id: Uuid.Uuid('8074a853-06a3-4539-b59b-0504be3844ec'),
  questions: {
    qualityRating: Option.none(),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: { answer: 'unsure', detail: Option.none() },
    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
    answerToIfTheDatasetHasTrackedChanges: Option.none(),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
    answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
    answerToIfTheDatasetIsDetailedEnough: Option.none(),
    answerToIfTheDatasetIsErrorFree: Option.none(),
    answerToIfTheDatasetMattersToItsAudience: Option.none(),
    answerToIfTheDatasetIsReadyToBeShared: Option.none(),
    answerToIfTheDatasetIsMissingAnything: Option.none(),
  },
  competingInterests: Option.none(),
  published: Temporal.PlainDate.from('2025-08-02'),
}
