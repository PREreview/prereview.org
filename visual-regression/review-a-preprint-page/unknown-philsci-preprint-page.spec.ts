import { createUnknownPhilsciPreprintPage } from '../../src/review-a-preprint-page/unknown-philsci-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPhilsciPreprintPage({ type: 'philsci', value: 1234 })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
