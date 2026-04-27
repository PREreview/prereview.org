import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as _ from '../../src/ExternalInteractions/Email/InviteAuthor/CreateEmail.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/PreprintId.ts'
import { PublicUrl } from '../../src/public-url.ts'
import { Doi } from '../../src/types/Doi.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    Effect.provide(
      _.CreateEmail({
        person: {
          name: NonEmptyString('Josiah Carberry'),
          emailAddress: EmailAddress('jcarberry@example.com'),
        },
        authorInviteId: Uuid('cda07004-01ec-4d48-8ff0-87bb32c6e81d'),
        newPrereview: {
          author: 'Jean-Baptiste Botul',
          preprint: {
            id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
            title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
            language: 'en',
          },
        },
      }),
      [Layer.succeed(Locale, DefaultLocale), Layer.succeed(PublicUrl, new URL('http://example.com'))],
    ),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async () => {
  const email = await Effect.runPromise(
    Effect.provide(
      _.CreateEmail({
        person: {
          name: NonEmptyString('Josiah Carberry'),
          emailAddress: EmailAddress('jcarberry@example.com'),
        },
        authorInviteId: Uuid('cda07004-01ec-4d48-8ff0-87bb32c6e81d'),
        newPrereview: {
          author: 'Jean-Baptiste Botul',
          preprint: {
            id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
            title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
            language: 'en',
          },
        },
      }),
      [Layer.succeed(Locale, DefaultLocale), Layer.succeed(PublicUrl, new URL('http://example.com'))],
    ),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})
