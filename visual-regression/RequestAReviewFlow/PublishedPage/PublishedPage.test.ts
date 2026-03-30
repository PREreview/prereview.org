import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/PublishedPage/PublishedPage.ts'
import { expect, test } from '../../base.ts'

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = _.PublishedPage(locale, preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
