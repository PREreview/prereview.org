import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { BiorxivPreprintId, PhilsciPreprintId } from '../../src/Preprints/index.js'
import { unknownPreprintPage } from '../../src/request-a-prereview-page/unknown-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right with a DOI ID', async ({ showPage }) => {
  const response = unknownPreprintPage(
    new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a PhilSci ID', async ({ showPage }) => {
  const response = unknownPreprintPage(new PhilsciPreprintId({ value: 21986 }), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
