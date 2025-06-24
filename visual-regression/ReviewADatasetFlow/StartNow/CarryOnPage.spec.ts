import * as _ from '../../../src/ReviewADatasetFlow/StartNow/CarryOnPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CarryOnPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
