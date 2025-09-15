import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { competingInterestsForm } from '../../src/write-review/competing-interests-page/competing-interests-form.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = competingInterestsForm(
    preprint,
    {
      competingInterests: E.right(undefined),
      competingInterestsDetails: E.right(undefined),
    },
    locale,
    'no',
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = competingInterestsForm(
    preprint,
    {
      competingInterests: E.right(undefined),
      competingInterestsDetails: E.right(undefined),
    },
    locale,
    'yes',
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when competing interests are missing', async ({ showPage }) => {
  const response = competingInterestsForm(
    preprint,
    {
      competingInterests: E.left(missingE()),
      competingInterestsDetails: E.right(undefined),
    },
    locale,
    'no',
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when details are missing', async ({ showPage }) => {
  const response = competingInterestsForm(
    preprint,
    {
      competingInterests: E.right('yes'),
      competingInterestsDetails: E.left(missingE()),
    },
    locale,
    'no',
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
