import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewADatasetPage/UnsupportedDoiPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.UnsupportedDoiPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
