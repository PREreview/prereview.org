import * as E from 'fp-ts/Either'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { personaForm } from '../../src/author-invite-flow/persona-page/persona-form'
import { missingE } from '../../src/form'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = personaForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    form: { persona: E.right(undefined) },
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    form: { persona: E.left(missingE()) },
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
