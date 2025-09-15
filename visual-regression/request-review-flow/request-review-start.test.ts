import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { carryOnPage } from '../../src/request-review-flow/start-page/carry-on-page.js'
import type { ReviewRequestPreprintId } from '../../src/review-request.js'
import { expect, test } from '../base.js'

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }) satisfies ReviewRequestPreprintId

const locale = DefaultLocale

test('content looks right when it has already been started', async ({ showPage }) => {
  const response = carryOnPage(locale, preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
