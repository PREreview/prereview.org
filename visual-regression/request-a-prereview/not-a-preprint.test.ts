import { notAPreprintPage } from '../../src/request-a-prereview-page/not-a-preprint-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(notAPreprintPage)

  await expect(content).toHaveScreenshot()
})
