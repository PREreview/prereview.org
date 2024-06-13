import { createFormPage } from '../../src/my-details-page/change-career-stage-visibility-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ careerStage: { value: 'mid', visibility: 'public' } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
