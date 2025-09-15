import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { writeReviewMatch } from '../../src/routes.js'
import { ownPreprintPage } from '../../src/write-review/own-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = ownPreprintPage(
    new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    writeReviewMatch.formatter,
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
