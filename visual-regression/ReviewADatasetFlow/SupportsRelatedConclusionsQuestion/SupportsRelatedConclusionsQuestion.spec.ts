import { Result } from 'effect'
import * as SupportsRelatedConclusionsForm from '../../../src/WebApp/ReviewADatasetFlow/SupportsRelatedConclusionsQuestion/SupportsRelatedConclusionsForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/SupportsRelatedConclusionsQuestion/SupportsRelatedConclusionsQuestion.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.CompletedForm({
      supportsRelatedConclusions: 'yes',
      supportsRelatedConclusionsYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      supportsRelatedConclusionsPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      supportsRelatedConclusionsNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.InvalidForm({
      supportsRelatedConclusions: Result.fail(new SupportsRelatedConclusionsForm.Missing()),
      supportsRelatedConclusionsYesDetail: Result.succeed(NonEmptyString.fromString('Detail about the yes.')),
      supportsRelatedConclusionsPartlyDetail: Result.succeed(NonEmptyString.fromString('Detail about the partly.')),
      supportsRelatedConclusionsNoDetail: Result.succeed(NonEmptyString.fromString('Detail about the no.')),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
