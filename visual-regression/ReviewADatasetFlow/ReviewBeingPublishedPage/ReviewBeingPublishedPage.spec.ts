import * as _ from '../../../src/ReviewADatasetFlow/ReviewBeingPublishedPage/ReviewBeingPublishedPage.ts'
import { Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewBeingPublishedPage({ datasetReviewId })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
