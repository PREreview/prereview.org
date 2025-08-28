import { Temporal } from '@js-temporal/polyfill'
import { Array, Option } from 'effect'
import type * as DatasetReviews from '../../src/DatasetReviews/index.js'
import { createDatasetReviewsPage } from '../../src/DatasetReviewsPage/DatasetReviewsPage.js'
import { Doi, Orcid, Uuid } from '../../src/types/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showTwoUpPage }) => {
  const response = createDatasetReviewsPage({
    datasetReviews: [prereview1, prereview2],
  })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

test('content looks right when empty', async ({ showTwoUpPage }) => {
  const response = createDatasetReviewsPage({ datasetReviews: Array.empty() })

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})

const prereview1: DatasetReviews.PublishedReview = {
  author: {
    name: 'Josiah Carberry',
    orcid: Orcid.Orcid('0000-0002-1825-0097'),
  },
  doi: Doi.Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  questions: {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
    answerToIfTheDatasetHasEnoughMetadata: Option.some('yes'),
    answerToIfTheDatasetHasTrackedChanges: Option.some('yes'),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('yes'),
  },
  published: Temporal.PlainDate.from('2025-08-06'),
}

const prereview2: DatasetReviews.PublishedReview = {
  author: {
    name: 'Orange Panda',
  },
  doi: Doi.Doi('10.5281/zenodo.10779311'),
  id: Uuid.Uuid('8074a853-06a3-4539-b59b-0504be3844ec'),
  questions: {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'unsure',
    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
    answerToIfTheDatasetHasTrackedChanges: Option.none(),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
  },
  published: Temporal.PlainDate.from('2025-08-02'),
}
