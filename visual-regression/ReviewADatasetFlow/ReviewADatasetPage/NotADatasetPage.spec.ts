import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/NotADatasetPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.NotADatasetPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
