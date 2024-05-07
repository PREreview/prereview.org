import * as O from 'fp-ts/Option'
import { createFormPage } from '../../src/my-details-page/change-career-stage-form-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ careerStage: O.some({ value: 'mid', visibility: 'public' }) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ careerStage: O.none })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = createFormPage({ careerStage: O.none, error: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
