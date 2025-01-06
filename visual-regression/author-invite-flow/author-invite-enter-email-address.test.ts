import * as E from 'fp-ts/lib/Either.js'
import type { Uuid } from 'uuid-ts'
import { enterEmailAddressForm } from '../../src/author-invite-flow/enter-email-address-page/enter-email-address-form.js'
import { invalidE, missingE } from '../../src/form.js'
import { EmailAddress } from '../../src/types/email-address.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    invitedEmailAddress: EmailAddress('jcarberry@example.com'),
    form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  await test.step('choice field', async () => {
    const response = enterEmailAddressForm({
      inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
      invitedEmailAddress: EmailAddress('jcarberry@example.com'),
      form: { useInvitedAddress: E.left(missingE()), otherEmailAddress: E.right(undefined) },
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })

  await test.step('other email address field', async () => {
    const response = enterEmailAddressForm({
      inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
      invitedEmailAddress: EmailAddress('jcarberry@example.com'),
      form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(missingE()) },
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    invitedEmailAddress: EmailAddress('jcarberry@example.com'),
    form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(invalidE('not an email address')) },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
