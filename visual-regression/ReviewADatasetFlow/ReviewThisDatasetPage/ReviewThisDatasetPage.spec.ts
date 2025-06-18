import * as _ from '../../../src/ReviewADatasetFlow/ReviewThisDatasetPage/ReviewThisDatasetPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewThisDatasetPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
