import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/UnsupportedUrlPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.UnsupportedUrlPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
