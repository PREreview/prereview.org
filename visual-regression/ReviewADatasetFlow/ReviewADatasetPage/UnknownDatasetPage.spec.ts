import * as Datasets from '../../../src/Datasets/index.ts'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewADatasetPage/UnknownDatasetPage.ts'
import { Doi } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.UnknownDatasetPage({ dataset })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const dataset = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
