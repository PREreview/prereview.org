import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { checkPage } from '../../src/author-invite-flow/check-page/check-page'
import { failureMessage } from '../../src/author-invite-flow/check-page/failure-message'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = checkPage({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    persona: 'public',
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = checkPage({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    persona: 'pseudonym',
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when the change can't be made", async ({ showPage }) => {
  const content = await showPage(failureMessage)

  await expect(content).toHaveScreenshot()
})
