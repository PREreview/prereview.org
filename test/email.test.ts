import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as _ from '../src/email.ts'
import type { Nodemailer } from '../src/ExternalApis/index.ts'
import { translate } from '../src/locales/index.ts'
import * as fc from './fc.ts'

describe('sendContactEmailAddressVerificationEmail', () => {
  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress(), fc.supportedLocale()])(
    'when the email can be sent',
    async (publicUrl, user, emailAddress, locale) => {
      const sendEmail = jest.fn<Nodemailer.SendEmailEnv['sendEmail']>(_ => TE.right(undefined))

      const actual = await _.sendContactEmailAddressVerificationEmail(
        user,
        emailAddress,
      )({
        sendEmail,
        locale,
        publicUrl,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { address: 'help@prereview.org', name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: translate(locale)('email', 'verifyEmailAddressTitle')(),
        }),
      )
    },
  )

  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress(), fc.supportedLocale()])(
    "when the email can't be sent",
    async (publicUrl, user, emailAddress, locale) => {
      const actual = await _.sendContactEmailAddressVerificationEmail(
        user,
        emailAddress,
      )({
        publicUrl,
        locale,
        sendEmail: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('sendContactEmailAddressVerificationEmailForReview', () => {
  test.prop([
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.indeterminatePreprintId(),
    fc.supportedLocale(),
  ])('when the email can be sent', async (publicUrl, user, emailAddress, preprint, locale) => {
    const sendEmail = jest.fn<Nodemailer.SendEmailEnv['sendEmail']>(_ => TE.right(undefined))

    const actual = await _.sendContactEmailAddressVerificationEmailForReview(
      user,
      emailAddress,
      preprint,
    )({
      sendEmail,
      locale,
      publicUrl,
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { address: 'help@prereview.org', name: 'PREreview' },
        to: { address: emailAddress.value, name: user.name },
        subject: translate(locale)('email', 'verifyEmailAddressTitle')(),
      }),
    )
  })

  test.prop([
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.indeterminatePreprintId(),
    fc.supportedLocale(),
  ])("when the email can't be sent", async (publicUrl, user, emailAddress, preprint, locale) => {
    const actual = await _.sendContactEmailAddressVerificationEmailForReview(
      user,
      emailAddress,
      preprint,
    )({
      publicUrl,
      locale,
      sendEmail: () => TE.left('unavailable'),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

test.prop([
  fc.origin(),
  fc.record({
    name: fc.nonEmptyString(),
    emailAddress: fc.emailAddress(),
  }),
  fc.uuid(),
  fc.record({
    author: fc.string(),
    preprint: fc.preprintTitle(),
  }),
  fc.supportedLocale(),
])('createAuthorInviteEmail', (publicUrl, person, authorInviteId, newPrereview, locale) => {
  const actual = _.createAuthorInviteEmail(person, authorInviteId, newPrereview, locale)({ publicUrl })

  expect(actual).toStrictEqual(
    expect.objectContaining({
      from: { address: 'help@prereview.org', name: 'PREreview' },
      to: { address: person.emailAddress, name: person.name },
      subject: translate(locale)('email', 'beListedAsAuthor')(),
    }),
  )
})
