import { DefaultLocale } from '../../src/locales/index.ts'
import * as _ from '../../src/WebApp/my-prereviews-page/no-prereviews.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.NoPrereviews, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
