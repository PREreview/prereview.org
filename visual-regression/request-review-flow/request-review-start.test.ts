import type { Doi } from 'doi-ts'
import { carryOnPage } from '../../src/request-review-flow/start-page/carry-on-page'
import type { ReviewRequestPreprintId } from '../../src/review-request'
import { expect, test } from '../base'

const preprint = {
  type: 'biorxiv',
  value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
} satisfies ReviewRequestPreprintId

test('content looks right when it has already been started', async ({ showPage }) => {
  const response = carryOnPage(preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
