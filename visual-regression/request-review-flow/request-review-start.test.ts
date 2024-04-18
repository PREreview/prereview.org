import { carryOnPage } from '../../src/request-review-flow/start-page/carry-on-page'
import { expect, test } from '../base'

test('content looks right when it has already been started', async ({ showPage }) => {
  const content = await showPage(carryOnPage)

  await expect(content).toHaveScreenshot()
})
