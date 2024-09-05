import { Doi } from 'doi-ts'
import { createUnknownPreprintWithDoiPage } from '../../src/review-a-preprint-page/unknown-preprint-with-doi-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPreprintWithDoiPage({
    type: 'biorxiv-medrxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
