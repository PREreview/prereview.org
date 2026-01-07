import { DefaultLocale } from '../../src/locales/index.ts'
import { PhilsciPreprintId } from '../../src/Preprints/index.ts'
import { createUnknownPhilsciPreprintPage } from '../../src/WebApp/review-a-preprint-page/unknown-philsci-preprint-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPhilsciPreprintPage(new PhilsciPreprintId({ value: 1234 }), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
