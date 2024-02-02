import * as E from 'fp-ts/Either'
import type { Uuid } from 'uuid-ts'
import { enterEmailAddressForm } from '../../src/author-invite-flow/enter-email-address-page/enter-email-address-form'
import { invalidE, missingE } from '../../src/form'
import type { EmailAddress } from '../../src/types/email-address'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    invitedEmailAddress: 'jcarberry@example.com' as EmailAddress,
    form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  await test.step('choice field', async () => {
    const response = enterEmailAddressForm({
      inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
      invitedEmailAddress: 'jcarberry@example.com' as EmailAddress,
      form: { useInvitedAddress: E.left(missingE()), otherEmailAddress: E.right(undefined) },
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })

  await test.step('other email address field', async () => {
    const response = enterEmailAddressForm({
      inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
      invitedEmailAddress: 'jcarberry@example.com' as EmailAddress,
      form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(missingE()) },
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    invitedEmailAddress: 'jcarberry@example.com' as EmailAddress,
    form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(invalidE('not an email address')) },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
