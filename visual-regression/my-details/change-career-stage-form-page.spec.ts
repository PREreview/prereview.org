import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/WebApp/my-details-page/change-career-stage-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    careerStage: Option.some({ value: 'mid', visibility: 'public' }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ careerStage: Option.none(), locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = createFormPage({ careerStage: Option.none(), error: true, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
