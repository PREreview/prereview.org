import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/WebApp/my-details-page/change-career-stage-visibility-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ careerStage: { value: 'mid', visibility: 'public' }, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
