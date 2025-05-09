import { DefaultLocale } from '../../src/locales/index.js'
import * as _ from '../../src/my-prereviews-page/no-prereviews.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.NoPrereviews, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
