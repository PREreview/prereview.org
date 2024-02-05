import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { createAuthorInviteEmail, createContactEmailAddressVerificationEmailForInvitedAuthor } from '../src/email'
import { html } from '../src/html'
import type { EmailAddress } from '../src/types/email-address'
import type { Pseudonym } from '../src/types/pseudonym'
import type { NonEmptyString } from '../src/types/string'
import { expect, test } from './base'

test('email-verification HTML for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: {
      type: 'unverified',
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    },
    authorInvite: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
  })({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('email-verification text for an invited author looks right', async ({ page }) => {
  const email = createContactEmailAddressVerificationEmailForInvitedAuthor({
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    emailAddress: {
      type: 'unverified',
      value: 'jcarberry@example.com' as EmailAddress,
      verificationToken: '2a29e36c-da26-438d-9a67-577101fa8968' as Uuid,
    },
    authorInvite: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
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
          value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
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
          value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
        },
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      },
    },
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})
