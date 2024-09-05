import { Doi } from 'doi-ts'
import { writeReviewMatch } from '../../src/routes.js'
import { ownPreprintPage } from '../../src/write-review/own-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = ownPreprintPage(
    { type: 'biorxiv', value: Doi('10.1101/2022.01.13.476201') },
    writeReviewMatch.formatter,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
