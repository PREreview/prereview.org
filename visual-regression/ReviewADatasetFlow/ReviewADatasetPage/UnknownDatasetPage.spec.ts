import * as Datasets from '../../../src/Datasets/index.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewADatasetPage/UnknownDatasetPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Doi } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.UnknownDatasetPage({ dataset, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const dataset = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
