import { Temporal } from '@js-temporal/polyfill'
import { Array, Option } from 'effect'
import * as _ from '../../src/DatasetReviewsPage/DatasetReviewsPage.js'
import * as Datasets from '../../src/Datasets/index.js'
import { html } from '../../src/html.js'
import * as Personas from '../../src/Personas/index.js'
import { Doi, NonEmptyString, OrcidId, Pseudonym, Uuid } from '../../src/types/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showTwoUpPage }) => {
  const response = _.createDatasetReviewsPage({ dataset, datasetReviews: [prereview1, prereview2] })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

test('content looks right when empty', async ({ showTwoUpPage }) => {
  const response = _.createDatasetReviewsPage({ dataset, datasetReviews: Array.empty() })

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
    { name: 'Jesse Wolf' },
    { name: 'Layla MacKay' },
    { name: 'Sarah Haworth' },
    { name: 'Morgan Dedato' },
    { name: 'Kiana Young' },
    { name: 'Marie-Laurence Cossette' },
    { name: 'Colin Elliott' },
    { name: 'Rebekah Oomen' },
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
  author: new Personas.PublicPersona({
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
  }),
  doi: Doi.Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  questions: {
    qualityRating: Option.some('excellent'),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
    answerToIfTheDatasetHasEnoughMetadata: Option.some('yes'),
    answerToIfTheDatasetHasTrackedChanges: Option.some('yes'),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('yes'),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
    answerToIfTheDatasetSupportsRelatedConclusions: Option.some('yes'),
    answerToIfTheDatasetIsDetailedEnough: Option.some('yes'),
    answerToIfTheDatasetIsErrorFree: Option.some('yes'),
    answerToIfTheDatasetMattersToItsAudience: Option.some('very-consequential'),
    answerToIfTheDatasetIsReadyToBeShared: Option.some('yes'),
    answerToIfTheDatasetIsMissingAnything: Option.some(
      NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    ),
  },
  competingInterests: Option.some(
    NonEmptyString.NonEmptyString(
      'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
    ),
  ),
  published: Temporal.PlainDate.from('2025-08-06'),
}

const prereview2: _.DatasetReview = {
  author: new Personas.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
  doi: Doi.Doi('10.5281/zenodo.10779311'),
  id: Uuid.Uuid('8074a853-06a3-4539-b59b-0504be3844ec'),
  questions: {
    qualityRating: Option.none(),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'unsure',
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
