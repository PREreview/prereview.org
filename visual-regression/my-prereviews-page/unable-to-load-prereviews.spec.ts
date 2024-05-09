import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.UnableToLoadPrereviews)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
