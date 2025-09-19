import * as Datasets from '../../../src/Datasets/index.js'
import { html } from '../../../src/html.js'
import * as _ from '../../../src/ReviewADatasetFlow/StartNow/CarryOnPage.js'
import * as Routes from '../../../src/routes.js'
import { Doi, Uuid } from '../../../src/types/index.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CarryOnPage({
    dataset,
    datasetReviewId: Uuid.Uuid('2f65bef9-36b4-4cd9-9958-8ee740519b2f'),
    nextRoute: Routes.ReviewADatasetCheckYourReview,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const dataset = new Datasets.DatasetTitle({
  id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
  title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
  language: 'en',
})
