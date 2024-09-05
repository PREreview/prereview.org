import { Doi } from 'doi-ts'
import { publishedPage } from '../../src/request-review-flow/published-page/published-page.js'
import type { ReviewRequestPreprintId } from '../../src/review-request.js'
import { expect, test } from '../base.js'

const preprint = {
  type: 'biorxiv',
  value: Doi('10.1101/2022.01.13.476201'),
} satisfies ReviewRequestPreprintId

test('content looks right', async ({ showPage }) => {
  const response = publishedPage(preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
