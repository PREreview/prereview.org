import { DefaultLocale } from '../../../src/locales/index.ts'
import { OpenForRequestsVisibilityPage } from '../../../src/WebApp/MyDetails/OpenForRequestsVisibilityPage/OpenForRequestsVisibilityPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = OpenForRequestsVisibilityPage({
    locale: DefaultLocale,
    openForRequests: { value: true, visibility: 'public' },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
