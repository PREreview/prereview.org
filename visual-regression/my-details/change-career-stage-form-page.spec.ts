import { Option } from 'effect'
import { createFormPage } from '../../src/my-details-page/change-career-stage-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ careerStage: Option.some({ value: 'mid', visibility: 'public' }) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ careerStage: Option.none() })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = createFormPage({ careerStage: Option.none(), error: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
