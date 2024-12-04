import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { UnverifiedContactEmailAddress } from '../src/contact-email-address.js'
import {
  createAuthorInviteEmail,
  createContactEmailAddressVerificationEmailForComment,
  createContactEmailAddressVerificationEmailForInvitedAuthor,
} from '../src/email.js'
import { html } from '../src/html.js'
import { DefaultLocale } from '../src/locales/index.js'
import type { EmailAddress } from '../src/types/email-address.js'
import type { Pseudonym } from '../src/types/pseudonym.js'
import type { NonEmptyString } from '../src/types/string.js'
import { expect, test } from './base.js'

test('email-verification HTML for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    }),
    authorInvite: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    }),
    authorInvite: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification HTML for a comment looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForComment({
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    }),
    comment: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    locale: DefaultLocale,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text for a comment looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForComment({
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: new UnverifiedContactEmailAddress({
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    }),
    comment: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    locale: DefaultLocale,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('author-invite HTML looks right', async ({ page }) => {
  const email = createAuthorInviteEmail(
    {
      name: 'Josiah Carberry' as NonEmptyString,
      emailAddress: 'jcarberry@example.com' as EmailAddress,
    },
    'cda07004-01ec-4d48-8ff0-87bb32c6e81d' as Uuid,
    {
      author: 'Jean-Baptiste Botul',
      preprint: {
        id: {
          type: 'biorxiv',
          value: Doi('10.1101/2022.01.13.476201'),
        },
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      },
    },
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('author-invite text looks right', async ({ page }) => {
  const email = createAuthorInviteEmail(
    {
      name: 'Josiah Carberry' as NonEmptyString,
      emailAddress: 'jcarberry@example.com' as EmailAddress,
    },
    'cda07004-01ec-4d48-8ff0-87bb32c6e81d' as Uuid,
    {
      author: 'Jean-Baptiste Botul',
      preprint: {
        id: {
          type: 'biorxiv',
          value: Doi('10.1101/2022.01.13.476201'),
        },
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      },
    },
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})
