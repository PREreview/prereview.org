import { Uuid } from 'uuid-ts'
import { needToVerifyEmailAddressPage } from '../../src/author-invite-flow/need-to-verify-email-address-page/need-to-verify-email-address-page.ts'
import { UnverifiedContactEmailAddress } from '../../src/contact-email-address.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = needToVerifyEmailAddressPage({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    contactEmailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
