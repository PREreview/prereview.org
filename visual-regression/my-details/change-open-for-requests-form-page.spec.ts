import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/WebApp/my-details-page/change-open-for-requests-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    locale: DefaultLocale,
    openForRequests: Option.some({ value: true, visibility: 'public' }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ locale: DefaultLocale, openForRequests: Option.none() })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = createFormPage({ locale: DefaultLocale, openForRequests: Option.none(), error: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
