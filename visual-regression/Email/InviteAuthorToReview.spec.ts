import { Effect, Layer } from 'effect'
import * as _ from '../../src/ExternalInteractions/Email/InviteAuthorToReview/CreateEmail.ts'
import { html } from '../../src/html.ts'
import { PublicUrl } from '../../src/public-url.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    Effect.provide(_.CreateEmail({ invitationId, invitee, inviter, subject }), [
      Layer.succeed(PublicUrl, new URL('http://example.com')),
    ]),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async () => {
  const email = await Effect.runPromise(
    Effect.provide(_.CreateEmail({ invitationId, invitee, inviter, subject }), [
      Layer.succeed(PublicUrl, new URL('http://example.com')),
    ]),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})

const invitationId = Uuid('cda07004-01ec-4d48-8ff0-87bb32c6e81d')

const invitee = {
  name: NonEmptyString('Josiah Carberry'),
  emailAddress: EmailAddress('jcarberry@example.com'),
}

const inviter = NonEmptyString('Jean-Baptiste Botul')

const subject = {
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en' as const,
}
