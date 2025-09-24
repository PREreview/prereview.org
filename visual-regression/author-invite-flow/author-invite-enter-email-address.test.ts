import * as E from 'fp-ts/lib/Either.js'
import { Uuid } from 'uuid-ts'
import { enterEmailAddressForm } from '../../src/author-invite-flow/enter-email-address-page/enter-email-address-form.ts'
import { invalidE, missingE } from '../../src/form.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    invitedEmailAddress: EmailAddress('jcarberry@example.com'),
    form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  await test.step('choice field', async () => {
    const response = enterEmailAddressForm({
      inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
      invitedEmailAddress: EmailAddress('jcarberry@example.com'),
      form: { useInvitedAddress: E.left(missingE()), otherEmailAddress: E.right(undefined) },
      locale: DefaultLocale,
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })

  await test.step('other email address field', async () => {
    const response = enterEmailAddressForm({
      inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
      invitedEmailAddress: EmailAddress('jcarberry@example.com'),
      form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(missingE()) },
      locale: DefaultLocale,
    })

    const content = await showPage(response)

    await expect(content).toHaveScreenshot()
  })
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = enterEmailAddressForm({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    invitedEmailAddress: EmailAddress('jcarberry@example.com'),
    form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.left(invalidE('not an email address')) },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
