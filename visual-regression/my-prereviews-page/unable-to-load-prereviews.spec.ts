import { DefaultLocale } from '../../src/locales/index.js'
import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.UnableToLoadPrereviews, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
