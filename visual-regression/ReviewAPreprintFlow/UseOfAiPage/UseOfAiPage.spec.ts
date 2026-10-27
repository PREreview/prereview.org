import { Either } from 'effect'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import * as UseOfAiForm from '../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiForm.ts'
import * as _ from '../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderUseOfAiPage({
    form: new UseOfAiForm.EmptyForm(),
    locale,
    moreAuthors: 'no',
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = _.renderUseOfAiPage({
    form: new UseOfAiForm.EmptyForm(),
    locale,
    moreAuthors: 'yes',
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when use of AI for ideas is missing', async ({ showPage }) => {
  const response = _.renderUseOfAiPage({
    form: new UseOfAiForm.InvalidForm({ generativeAiIdeas: Either.left(new UseOfAiForm.Missing()) }),
    locale,
    moreAuthors: 'no',
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
