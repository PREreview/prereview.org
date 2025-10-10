import { Either } from 'effect'
import * as DeclareCompetingInterestsForm from '../../../src/ReviewADatasetFlow/DeclareCompetingInterestsPage/DeclareCompetingInterestsForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/DeclareCompetingInterestsPage/DeclareCompetingInterestsPage.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.DeclareCompetingInterestsPage({
    datasetReviewId,
    form: new DeclareCompetingInterestsForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a choice', async ({ showPage }) => {
  const response = _.DeclareCompetingInterestsPage({
    datasetReviewId,
    form: new DeclareCompetingInterestsForm.CompletedForm({
      declareCompetingInterests: 'yes',
      competingInterestsDetails: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the choice is missing', async ({ showPage }) => {
  const response = _.DeclareCompetingInterestsPage({
    datasetReviewId,
    form: new DeclareCompetingInterestsForm.InvalidForm({
      declareCompetingInterests: Either.left(new DeclareCompetingInterestsForm.Missing()),
      competingInterestsDetails: Either.left(new DeclareCompetingInterestsForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
