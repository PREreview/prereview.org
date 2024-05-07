import { createFormPage } from '../../src/my-details-page/change-career-stage-visibility-form-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ careerStage: { value: 'mid', visibility: 'public' } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
