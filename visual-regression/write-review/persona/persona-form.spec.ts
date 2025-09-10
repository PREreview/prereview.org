import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { Doi, Orcid, Pseudonym } from '../../../src/types/index.js'
import { NonEmptyString } from '../../../src/types/NonEmptyString.js'
import { BiorxivPreprintId } from '../../../src/types/preprint-id.js'
import type { User } from '../../../src/user.js'
import { personaForm } from '../../../src/write-review/persona/persona-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = personaForm(preprint, { persona: E.right(undefined) }, undefined, user, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm(preprint, { persona: E.left(missingE()) }, undefined, user, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi.Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: Orcid.Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym.Pseudonym('Orange Panda'),
} satisfies User
