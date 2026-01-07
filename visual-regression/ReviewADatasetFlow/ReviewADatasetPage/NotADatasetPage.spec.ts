import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewADatasetPage/NotADatasetPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.NotADatasetPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
