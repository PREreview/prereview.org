import { Doi } from 'doi-ts'
import { Uuid } from 'uuid-ts'
import { UnverifiedContactEmailAddress } from '../src/contact-email-address.ts'
import {
  createAuthorInviteEmail,
  createContactEmailAddressVerificationEmail,
  createContactEmailAddressVerificationEmailForComment,
  createContactEmailAddressVerificationEmailForInvitedAuthor,
} from '../src/email.ts'
import { html } from '../src/html.ts'
import { DefaultLocale } from '../src/locales/index.ts'
import { BiorxivPreprintId } from '../src/Preprints/index.ts'
import { EmailAddress } from '../src/types/EmailAddress.ts'
import { NonEmptyString } from '../src/types/NonEmptyString.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Pseudonym } from '../src/types/Pseudonym.ts'
import { expect, test } from './base.ts'

test('email-verification HTML looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmail({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    verificationUrl: new URL('http://example.com'),
  })({ locale: DefaultLocale })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmail({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    verificationUrl: new URL('http://example.com'),
  })({ locale: DefaultLocale })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification HTML for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    authorInvite: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
  })({ publicUrl: new URL('http://example.com'), locale: DefaultLocale })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    authorInvite: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
  })({ publicUrl: new URL('http://example.com'), locale: DefaultLocale })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification HTML for a comment looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForComment({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    comment: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    locale: DefaultLocale,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text for a comment looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForComment({
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: EmailAddress('jcarberry@example.com'),
      verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
    }),
    comment: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    locale: DefaultLocale,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('author-invite HTML looks right', async ({ page }) => {
  const email = createAuthorInviteEmail(
    {
      name: NonEmptyString('Josiah Carberry'),
      emailAddress: EmailAddress('jcarberry@example.com'),
    },
    Uuid('cda07004-01ec-4d48-8ff0-87bb32c6e81d'),
    {
      author: 'Jean-Baptiste Botul',
      preprint: {
        id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      },
    },
    DefaultLocale,
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('author-invite text looks right', async ({ page }) => {
  const email = createAuthorInviteEmail(
    {
      name: NonEmptyString('Josiah Carberry'),
      emailAddress: EmailAddress('jcarberry@example.com'),
    },
    Uuid('cda07004-01ec-4d48-8ff0-87bb32c6e81d'),
    {
      author: 'Jean-Baptiste Botul',
      preprint: {
        id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      },
    },
    DefaultLocale,
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})
