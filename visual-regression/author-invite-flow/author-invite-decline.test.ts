import type { Uuid } from 'uuid-ts'
import { inviteDeclinedPage } from '../../src/author-invite-flow/decline-page/invite-declined-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = inviteDeclinedPage('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
