import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.js'
import { useOfAiForm } from '../../src/write-review/use-of-ai-page/use-of-ai-form.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = useOfAiForm(preprint, { generativeAiIdeas: E.right(undefined) }, locale, 'no')

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = useOfAiForm(preprint, { generativeAiIdeas: E.right(undefined) }, locale, 'yes')

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when use of AI for ideas is missing', async ({ showPage }) => {
  const response = useOfAiForm(preprint, { generativeAiIdeas: E.left(missingE()) }, locale, 'no')

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
