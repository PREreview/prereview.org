import * as _ from '../../src/my-prereviews-page/no-prereviews'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(_.NoPrereviews)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
