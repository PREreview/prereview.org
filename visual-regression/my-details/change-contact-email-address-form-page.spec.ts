import * as E from 'fp-ts/Either'
import { invalidE, missingE } from '../../src/form'
import { createFormPage } from '../../src/my-details-page/change-contact-email-address-form-page'
import type { EmailAddress } from '../../src/types/email-address'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.right('jcarberry@example.com' as EmailAddress) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.right(undefined) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when it is missing', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.left(missingE()) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when it is invalid', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.left(invalidE('not an email address')) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
