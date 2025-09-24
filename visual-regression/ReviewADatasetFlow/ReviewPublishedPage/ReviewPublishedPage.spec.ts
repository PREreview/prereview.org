import * as _ from '../../../src/ReviewADatasetFlow/ReviewPublishedPage/ReviewPublishedPage.ts'
import { Doi, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewPublishedPage({ datasetReviewId, doi })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const doi = Doi.Doi('10.5072/zenodo.1061864')
