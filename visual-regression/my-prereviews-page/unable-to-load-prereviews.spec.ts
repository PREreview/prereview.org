import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.UnableToLoadPrereviews)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
