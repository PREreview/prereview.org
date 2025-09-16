import * as E from 'fp-ts/lib/Either.js'
import { Uuid } from 'uuid-ts'
import { personaForm } from '../../src/author-invite-flow/persona-page/persona-form.js'
import { missingE } from '../../src/form.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { OrcidId } from '../../src/types/OrcidId.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = personaForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    form: { persona: E.right(undefined) },
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    form: { persona: E.left(missingE()) },
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
