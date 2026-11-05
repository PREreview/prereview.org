import { DefaultLocale } from '../../../src/locales/index.ts'
import { CareerStageVisibilityPage } from '../../../src/WebApp/MyDetails/CareerStageVisibilityPage/CareerStageVisibilityPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = CareerStageVisibilityPage({
    careerStage: { value: 'mid', visibility: 'public' },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
