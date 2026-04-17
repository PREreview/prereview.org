import { Doi } from 'doi-ts'
import { Uuid } from 'uuid-ts'
import { createAuthorInviteEmail } from '../../src/ExternalInteractions/Email/legacy-email.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

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

test('author-invite text looks right', { tag: '@text' }, ({}) => {
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

  expect(`${email.text}\n`).toMatchSnapshot()
})
