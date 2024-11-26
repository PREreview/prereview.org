import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import * as ContactEmailAddress from '../../src/contact-email-address.js'
import { LoggedInUser } from '../../src/Context.js'
import * as Routes from '../../src/routes.js'
import { RouteForCommand } from '../../src/WriteCommentFlow/Routes.js'
import * as _ from '../../src/WriteCommentFlow/VerifyEmailAddress/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('VerifyEmailAddressPage', () => {
  describe('when there is a user', () => {
    describe('when the email address needs to be verified', () => {
      test.prop([
        fc.uuid(),
        fc.user(),
        fc.unverifiedContactEmailAddress(),
        fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
      ])('when the email address can be verified', (commentId, user, contactEmailAddress, nextCommand) =>
        Effect.gen(function* () {
          const getNextExpectedCommandForUserOnAComment = jest.fn<
            typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
          >(_ => Effect.succeed(Either.right(nextCommand)))
          const getContactEmailAddress = jest.fn<typeof ContactEmailAddress.GetContactEmailAddress.Service>(_ =>
            Effect.succeed(contactEmailAddress),
          )
          const saveContactEmailAddress = jest.fn<typeof ContactEmailAddress.SaveContactEmailAddress.Service>(
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
        }).pipe(Effect.provideService(LoggedInUser, user), Effect.provide(TestContext.TestContext), Effect.runPromise),
      )

      test.prop([
        fc.uuid(),
        fc.user(),
        fc
          .tuple(fc.unverifiedContactEmailAddress(), fc.uuid())
          .filter(([contactEmailAddress, token]) => contactEmailAddress.verificationToken !== token),
      ])("when the token doesn't match", (commentId, user, [contactEmailAddress, token]) =>
        Effect.gen(function* () {
          const actual = yield* _.VerifyEmailAddress({
            commentId,
            token,
          })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () => Effect.succeed(contactEmailAddress)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )

      test.prop([fc.uuid(), fc.user(), fc.unverifiedContactEmailAddress()])(
        "when the email address can't be verified",
        (commentId, user, contactEmailAddress) =>
          Effect.gen(function* () {
            const actual = yield* _.VerifyEmailAddress({
              commentId,
              token: contactEmailAddress.verificationToken,
            }).pipe(
              Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, () =>
                Effect.fail(new ContactEmailAddress.ContactEmailAddressIsUnavailable()),
              ),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.SERVICE_UNAVAILABLE,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provideService(LoggedInUser, user),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.succeed(contactEmailAddress),
            ),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
      )
    })

    test.prop([fc.uuid(), fc.user(), fc.verifiedContactEmailAddress(), fc.uuid()])(
      'when the email address is already verified',
      (commentId, user, contactEmailAddress, token) =>
        Effect.gen(function* () {
          const actual = yield* _.VerifyEmailAddress({ commentId, token })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(LoggedInUser, user),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () => Effect.succeed(contactEmailAddress)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([fc.uuid(), fc.user(), fc.uuid()])('when there is no email address', (commentId, user, token) =>
      Effect.gen(function* () {
        const actual = yield* _.VerifyEmailAddress({ commentId, token }).pipe(
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
            Effect.fail(new ContactEmailAddress.ContactEmailAddressIsNotFound()),
          ),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(LoggedInUser, user),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test.prop([fc.uuid(), fc.uuid()])("when there isn't a user", (commentId, token) =>
    Effect.gen(function* () {
      const actual = yield* _.VerifyEmailAddress({ commentId, token })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
      Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
