import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/UnsupportedDoiPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.UnsupportedDoiPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
