import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { CareerStagePage } from '../../../src/WebApp/MyDetails/CareerStagePage/CareerStagePage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = CareerStagePage({
    careerStage: Option.some({ value: 'mid', visibility: 'public' }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = CareerStagePage({ careerStage: Option.none(), locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = CareerStagePage({ careerStage: Option.none(), error: true, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
