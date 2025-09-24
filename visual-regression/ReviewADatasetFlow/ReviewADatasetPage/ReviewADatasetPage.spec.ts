import { Either } from 'effect'
import * as ReviewADatasetForm from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/ReviewADatasetForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/ReviewADatasetPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewADatasetPage({
    form: new ReviewADatasetForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is invalid', async ({ showPage }) => {
  const response = _.ReviewADatasetPage({
    form: new ReviewADatasetForm.InvalidForm({
      whichDataset: Either.left(new ReviewADatasetForm.Invalid({ value: 'not-a-dataset' })),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.ReviewADatasetPage({
    form: new ReviewADatasetForm.InvalidForm({
      whichDataset: Either.left(new ReviewADatasetForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
