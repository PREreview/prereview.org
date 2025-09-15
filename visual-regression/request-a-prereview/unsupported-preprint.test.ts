import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { unsupportedPreprintPage } from '../../src/request-a-prereview-page/unsupported-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = unsupportedPreprintPage(
    new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
