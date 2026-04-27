import * as E from 'fp-ts/lib/Either.js'
import * as Personas from '../../src/Personas/index.ts'
import { personaForm } from '../../src/WebApp/author-invite-flow/persona-page/persona-form.ts'
import { missingE } from '../../src/form.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = personaForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    form: { persona: E.right(undefined) },
    publicPersona: new Personas.PublicPersona({
      name: NonEmptyString('Josiah Carberry'),
      orcidId: OrcidId('0000-0002-1825-0097'),
    }),
    pseudonymPersona: new Personas.PseudonymPersona({ pseudonym: Pseudonym('Orange Panda') }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    form: { persona: E.left(missingE()) },
    publicPersona: new Personas.PublicPersona({
      name: NonEmptyString('Josiah Carberry'),
      orcidId: OrcidId('0000-0002-1825-0097'),
    }),
    pseudonymPersona: new Personas.PseudonymPersona({ pseudonym: Pseudonym('Orange Panda') }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
