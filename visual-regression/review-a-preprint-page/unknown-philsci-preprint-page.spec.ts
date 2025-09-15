import { DefaultLocale } from '../../src/locales/index.js'
import { PhilsciPreprintId } from '../../src/Preprints/index.js'
import { createUnknownPhilsciPreprintPage } from '../../src/review-a-preprint-page/unknown-philsci-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPhilsciPreprintPage(new PhilsciPreprintId({ value: 1234 }), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
