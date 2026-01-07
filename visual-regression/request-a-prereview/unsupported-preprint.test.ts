import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { unsupportedPreprintPage } from '../../src/WebApp/request-a-prereview-page/unsupported-preprint-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = unsupportedPreprintPage(
    new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
