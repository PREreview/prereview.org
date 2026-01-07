import { Either } from 'effect'
import * as IsAppropriateForThisKindOfResearchForm from '../../../src/WebApp/ReviewADatasetFlow/IsAppropriateForThisKindOfResearchQuestion/IsAppropriateForThisKindOfResearchForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/IsAppropriateForThisKindOfResearchQuestion/IsAppropriateForThisKindOfResearchQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.CompletedForm({
      isAppropriateForThisKindOfResearch: 'yes',
      isAppropriateForThisKindOfResearchYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      isAppropriateForThisKindOfResearchPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      isAppropriateForThisKindOfResearchNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.InvalidForm({
      isAppropriateForThisKindOfResearch: Either.left(new IsAppropriateForThisKindOfResearchForm.Missing()),
      isAppropriateForThisKindOfResearchYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      isAppropriateForThisKindOfResearchPartlyDetail: Either.right(
        NonEmptyString.fromString('Detail about the partly.'),
      ),
      isAppropriateForThisKindOfResearchNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
