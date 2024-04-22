import { requestAPrereviewPage } from '../../src/request-a-prereview-page/request-a-prereview-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(requestAPrereviewPage)

  await expect(content).toHaveScreenshot()
})
