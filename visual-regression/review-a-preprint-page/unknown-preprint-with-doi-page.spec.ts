import type { Doi } from 'doi-ts'
import { createUnknownPreprintWithDoiPage } from '../../src/review-a-preprint-page/unknown-preprint-with-doi-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPreprintWithDoiPage({
    type: 'biorxiv-medrxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
