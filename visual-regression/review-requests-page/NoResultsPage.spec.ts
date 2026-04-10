import { DefaultLocale } from '../../src/locales/index.ts'
import * as _ from '../../src/WebApp/ReviewRequestsPage/NoResultsPage.ts'
import { expect, test } from '../base.ts'

test('content looks right when empty', async ({ showPage }) => {
  const response = _.NoResultsPage({ locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a language', async ({ showPage }) => {
  const response = _.NoResultsPage({ language: 'es', locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a field', async ({ showPage }) => {
  const response = _.NoResultsPage({ field: '30', locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale
