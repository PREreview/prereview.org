import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { createFormPage } from '../../src/WebApp/my-details-page/change-contact-email-address-form-page.ts'
import { expect, test } from '../base.ts'

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
