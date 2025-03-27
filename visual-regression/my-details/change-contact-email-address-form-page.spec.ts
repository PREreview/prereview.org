import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-contact-email-address-form-page.js'
import { EmailAddress } from '../../src/types/email-address.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.right(EmailAddress('jcarberry@example.com')) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.right(undefined) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when it is missing', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.left(missingE()) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when it is invalid', async ({ showPage }) => {
  const response = createFormPage({ emailAddress: E.left(invalidE('not an email address')) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
