import { Either } from 'effect'
import * as FollowsFairAndCarePrinciplesForm from '../../../src/ReviewADatasetFlow/FollowsFairAndCarePrinciplesQuestion/FollowsFairAndCarePrinciplesForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/FollowsFairAndCarePrinciplesQuestion/FollowsFairAndCarePrinciplesQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.FollowsFairAndCarePrinciplesQuestion({
    datasetReviewId,
    form: new FollowsFairAndCarePrinciplesForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.FollowsFairAndCarePrinciplesQuestion({
    datasetReviewId,
    form: new FollowsFairAndCarePrinciplesForm.CompletedForm({
      followsFairAndCarePrinciples: 'yes',
      followsFairAndCarePrinciplesYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      followsFairAndCarePrinciplesPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      followsFairAndCarePrinciplesNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.FollowsFairAndCarePrinciplesQuestion({
    datasetReviewId,
    form: new FollowsFairAndCarePrinciplesForm.InvalidForm({
      followsFairAndCarePrinciples: Either.left(new FollowsFairAndCarePrinciplesForm.Missing()),
      followsFairAndCarePrinciplesYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      followsFairAndCarePrinciplesPartlyDetail: Either.right(NonEmptyString.fromString('Detail about the partly.')),
      followsFairAndCarePrinciplesNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
