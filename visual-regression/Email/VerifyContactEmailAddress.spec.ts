import { Effect, Layer } from 'effect'
import { UnverifiedContactEmailAddress } from '../../src/contact-email-address.ts'
import { Locale } from '../../src/Context.ts'
import * as _ from '../../src/ExternalInteractions/Email/VerifyContactEmailAddress/CreateEmail.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { PublicUrl } from '../../src/public-url.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    Effect.provide(
      _.CreateEmail({
        name: NonEmptyString('Josiah Carberry'),
        emailAddress: new UnverifiedContactEmailAddress({
          value: EmailAddress('jcarberry@example.com'),
          verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
        }),
      }),
      [Layer.succeed(Locale, DefaultLocale), Layer.succeed(PublicUrl, new URL('http://example.com'))],
    ),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async ({}) => {
  const email = await Effect.runPromise(
    Effect.provide(
      _.CreateEmail({
        name: NonEmptyString('Josiah Carberry'),
        emailAddress: new UnverifiedContactEmailAddress({
          value: EmailAddress('jcarberry@example.com'),
          verificationToken: Uuid('2a29e36c-da26-438d-9a67-577101fa8968'),
        }),
      }),
      [Layer.succeed(Locale, DefaultLocale), Layer.succeed(PublicUrl, new URL('http://example.com'))],
    ),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})
