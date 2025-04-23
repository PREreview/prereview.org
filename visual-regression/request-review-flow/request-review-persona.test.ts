import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { Orcid } from 'orcid-id-ts'
import { missingE } from '../../src/form.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { personaForm } from '../../src/request-review-flow/persona-page/persona-form.js'
import type { ReviewRequestPreprintId } from '../../src/review-request.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import type { User } from '../../src/user.js'
import { expect, test } from '../base.js'

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

const preprint = {
  _tag: 'biorxiv',
  value: Doi('10.1101/2022.01.13.476201'),
} satisfies ReviewRequestPreprintId

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = personaForm({
    form: { persona: E.right(undefined) },
    preprint,
    user,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm({
    form: { persona: E.left(missingE()) },
    preprint,
    user,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
