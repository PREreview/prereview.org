import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Either } from 'effect'
import * as Comments from '../../../src/Comments/index.ts'
import * as ContactEmailAddress from '../../../src/contact-email-address.ts'
import { Locale } from '../../../src/Context.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import { RouteForCommand } from '../../../src/WebApp/WriteCommentFlow/Routes.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/VerifyEmailAddress/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('VerifyEmailAddressPage', () => {
  describe('when there is a user', () => {
    describe('when the email address needs to be verified', () => {
      it.effect.prop(
        'when the email address can be verified',
        [
          fc.uuid(),
          fc.supportedLocale(),
          fc.user(),
          fc.unverifiedContactEmailAddress(),
          fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
        ],
        ([commentId, locale, user, contactEmailAddress, nextCommand]) =>
          Effect.gen(function* () {
            const getNextExpectedCommandForUserOnAComment = vi.fn<
              typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
            >(_ => Effect.succeed(Either.right(nextCommand)))
            const getContactEmailAddress = vi.fn<typeof ContactEmailAddress.GetContactEmailAddress.Service>(_ =>
              Effect.succeed(contactEmailAddress),
            )
            const saveContactEmailAddress = vi.fn<typeof ContactEmailAddress.SaveContactEmailAddress.Service>(
              _ => Effect.void,
            )

            const actual = yield* _.VerifyEmailAddress({
              commentId,
              token: contactEmailAddress.verificationToken,
            }).pipe(
              Effect.provideService(
                Comments.GetNextExpectedCommandForUserOnAComment,
                getNextExpectedCommandForUserOnAComment,
              ),
              Effect.provideService(ContactEmailAddress.GetContactEmailAddress, getContactEmailAddress),
              Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, saveContactEmailAddress),
            )

            expect(actual).toStrictEqual({
              _tag: 'FlashMessageResponse',
              location: RouteForCommand(nextCommand).href({ commentId }),
              message: 'contact-email-verified',
            })

            expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
            expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
            expect(saveContactEmailAddress).toHaveBeenCalledWith(
              user.orcid,
              new ContactEmailAddress.VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
            )
          }).pipe(Effect.provideService(Locale, locale), Effect.provideService(LoggedInUser, user)),
      )

      it.effect.prop(
        "when the token doesn't match",
        [
          fc.uuid(),
          fc.supportedLocale(),
          fc.user(),
          fc
            .tuple(fc.unverifiedContactEmailAddress(), fc.uuid())
            .filter(([contactEmailAddress, token]) => contactEmailAddress.verificationToken !== token),
        ],
        ([commentId, locale, user, [contactEmailAddress, token]]) =>
          Effect.gen(function* () {
            const actual = yield* _.VerifyEmailAddress({
              commentId,
              token,
            })

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.NotFound,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(LoggedInUser, user),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.succeed(contactEmailAddress),
            ),
            Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          ),
      )

      it.effect.prop(
        "when the email address can't be verified",
        [fc.uuid(), fc.supportedLocale(), fc.user(), fc.unverifiedContactEmailAddress()],
        ([commentId, locale, user, contactEmailAddress]) =>
          Effect.gen(function* () {
            const actual = yield* _.VerifyEmailAddress({
              commentId,
              token: contactEmailAddress.verificationToken,
            }).pipe(
              Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, () =>
                Effect.fail(new ContactEmailAddress.ContactEmailAddressIsUnavailable({})),
              ),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(LoggedInUser, user),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.succeed(contactEmailAddress),
            ),
          ),
      )
    })

    it.effect.prop(
      'when the email address is already verified',
      [fc.uuid(), fc.supportedLocale(), fc.user(), fc.verifiedContactEmailAddress(), fc.uuid()],
      ([commentId, locale, user, contactEmailAddress, token]) =>
        Effect.gen(function* () {
          const actual = yield* _.VerifyEmailAddress({ commentId, token })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () => Effect.succeed(contactEmailAddress)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
        ),
    )

    it.effect.prop(
      'when there is no email address',
      [fc.uuid(), fc.supportedLocale(), fc.user(), fc.uuid()],
      ([commentId, locale, user, token]) =>
        Effect.gen(function* () {
          const actual = yield* _.VerifyEmailAddress({ commentId, token }).pipe(
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.fail(new ContactEmailAddress.ContactEmailAddressIsNotFound()),
            ),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
        ),
    )
  })

  it.effect.prop(
    "when there isn't a user",
    [fc.uuid(), fc.supportedLocale(), fc.uuid()],
    ([commentId, locale, token]) =>
      Effect.gen(function* () {
        const actual = yield* _.VerifyEmailAddress({ commentId, token })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
      ),
  )
})
