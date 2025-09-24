import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { publishedPage } from '../../src/request-review-flow/published-page/published-page.ts'
import type { ReviewRequestPreprintId } from '../../src/review-request.ts'
import { expect, test } from '../base.ts'

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }) satisfies ReviewRequestPreprintId

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = publishedPage(locale, preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
