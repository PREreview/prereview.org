import * as _ from '../../../src/ReviewADatasetFlow/StartNow/CarryOnPage.js'
import { Uuid } from '../../../src/types/index.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CarryOnPage({ datasetReviewId: Uuid.Uuid('2f65bef9-36b4-4cd9-9958-8ee740519b2f') })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
