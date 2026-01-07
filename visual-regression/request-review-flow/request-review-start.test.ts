import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import type { ReviewRequestPreprintId } from '../../src/review-request.ts'
import { carryOnPage } from '../../src/WebApp/request-review-flow/start-page/carry-on-page.ts'
import { expect, test } from '../base.ts'

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }) satisfies ReviewRequestPreprintId

const locale = DefaultLocale

test('content looks right when it has already been started', async ({ showPage }) => {
  const response = carryOnPage(locale, preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
