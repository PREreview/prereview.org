import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivOrMedrxivPreprintId } from '../../src/Preprints/index.ts'
import { createUnknownPreprintWithDoiPage } from '../../src/review-a-preprint-page/unknown-preprint-with-doi-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createUnknownPreprintWithDoiPage(
    new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
