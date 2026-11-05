import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { OpenForRequestsPage } from '../../../src/WebApp/MyDetails/OpenForRequestsPage/OpenForRequestsPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = OpenForRequestsPage({
    locale: DefaultLocale,
    openForRequests: Option.some({ value: true, visibility: 'public' }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = OpenForRequestsPage({ locale: DefaultLocale, openForRequests: Option.none() })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = OpenForRequestsPage({ locale: DefaultLocale, openForRequests: Option.none(), error: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
