import type { Uuid } from 'uuid-ts'
import { needToVerifyEmailAddressPage } from '../../src/author-invite-flow/need-to-verify-email-address-page/need-to-verify-email-address-page'
import type { EmailAddress } from '../../src/types/email-address'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = needToVerifyEmailAddressPage({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    contactEmailAddress: {
      type: 'unverified',
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
