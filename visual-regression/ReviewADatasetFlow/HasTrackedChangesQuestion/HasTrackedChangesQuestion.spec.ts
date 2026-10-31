import { Result } from 'effect'
import * as HasTrackedChangesForm from '../../../src/WebApp/ReviewADatasetFlow/HasTrackedChangesQuestion/HasTrackedChangesForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/HasTrackedChangesQuestion/HasTrackedChangesQuestion.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.CompletedForm({
      hasTrackedChanges: 'yes',
      hasTrackedChangesYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      hasTrackedChangesPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      hasTrackedChangesNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.InvalidForm({
      hasTrackedChanges: Result.fail(new HasTrackedChangesForm.Missing()),
      hasTrackedChangesYesDetail: Result.succeed(NonEmptyString.fromString('Detail about the yes.')),
      hasTrackedChangesPartlyDetail: Result.succeed(NonEmptyString.fromString('Detail about the partly.')),
      hasTrackedChangesNoDetail: Result.succeed(NonEmptyString.fromString('Detail about the no.')),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
