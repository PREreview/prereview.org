import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewADatasetPage/UnsupportedUrlPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.UnsupportedUrlPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
