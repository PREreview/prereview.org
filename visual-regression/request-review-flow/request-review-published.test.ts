import type { Doi } from 'doi-ts'
import { publishedPage } from '../../src/request-review-flow/published-page/published-page'
import type { ReviewRequestPreprintId } from '../../src/review-request'
import { expect, test } from '../base'

const preprint = {
  type: 'biorxiv',
  value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
} satisfies ReviewRequestPreprintId

test('content looks right', async ({ showPage }) => {
  const response = publishedPage(preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
