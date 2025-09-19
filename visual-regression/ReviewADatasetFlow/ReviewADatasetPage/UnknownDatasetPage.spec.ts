import * as Datasets from '../../../src/Datasets/index.js'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/UnknownDatasetPage.js'
import { Doi } from '../../../src/types/index.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.UnknownDatasetPage({ dataset })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const dataset = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
