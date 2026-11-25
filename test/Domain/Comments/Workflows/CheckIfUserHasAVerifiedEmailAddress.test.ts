import { Effect, Layer, Result } from 'effect'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../src/Domain/Comments/Workflows/CheckIfUserHasAVerifiedEmailAddress.ts'
import {
  ContactEmailAddresses,
  ContactEmailAddressIsNotFound,
} from '../../../../src/Domain/ContactEmailAddresses/index.ts'
import { UnableToHandleCommand } from '../../../../src/EventSourcing/Commands.ts'
import * as Queries from '../../../../src/EventSourcing/Queries.ts'
import * as fc from '../../../fc.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'
import { describe, expect, it, vi } from '../../../vitest.ts'

describe('CheckIfUserHasAVerifiedEmailAddress', () => {
  it.effect.prop(
    'confirms the user has a verified email address',
    [
      fc.uuid(),
      fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) }),
      fc.verifiedContactEmailAddress(),
    ],
    ([commentId, comment, verifiedEmailAddress]) =>
      Effect.gen(function* () {
        const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(() => Effect.void)

        const actual = yield* Effect.result(
          Effect.provideService(
            _.CheckIfUserHasAVerifiedEmailAddress(commentId),
            Comments.HandleCommentCommand,
            handleCommentCommand,
          ),
        )

        expect(actual).toStrictEqual(Result.void)
        expect(handleCommentCommand).toHaveBeenCalledWith(
          new Comments.ConfirmExistenceOfVerifiedEmailAddress({ commentId }),
        )
      }).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => Effect.succeed(verifiedEmailAddress) }),
        ]),
      ),
  )

  it.effect.prop(
    "when the user doesn't have a verified email address",
    [
      fc.uuid(),
      fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) }),
      fc.either(fc.constant(new ContactEmailAddressIsNotFound()), fc.unverifiedContactEmailAddress()),
    ],
    ([commentId, comment, emailAddress]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.result(_.CheckIfUserHasAVerifiedEmailAddress(commentId))

        expect(actual).toStrictEqual(Result.void)
      }).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => Effect.fromResult(emailAddress) }),
          Layer.succeed(Comments.HandleCommentCommand, shouldNotBeCalled),
        ]),
      ),
  )

  it.effect.prop(
    "when the comment doesn't need checking",
    [
      fc.uuid(),
      fc.oneof(
        fc.commentNotStarted(),
        fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(true) }),
        fc.commentReadyForPublishing(),
        fc.commentBeingPublished(),
        fc.commentPublished(),
      ),
    ],
    ([commentId, comment]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.result(_.CheckIfUserHasAVerifiedEmailAddress(commentId))

        expect(actual).toStrictEqual(Result.void)
      }).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ContactEmailAddresses, {}),
          Layer.succeed(Comments.HandleCommentCommand, shouldNotBeCalled),
        ]),
      ),
  )

  it.effect.prop("when the comment can't be read", [fc.uuid()], ([commentId]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.CheckIfUserHasAVerifiedEmailAddress(commentId))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToCheckForAVerifiedEmailAddress({ cause: new Queries.UnableToQuery({}) })),
      )
    }).pipe(
      Effect.provide([
        Layer.succeed(Comments.GetComment, () => new Queries.UnableToQuery({})),
        Layer.mock(ContactEmailAddresses, {}),
        Layer.succeed(Comments.HandleCommentCommand, shouldNotBeCalled),
      ]),
    ),
  )

  it.effect.prop(
    "when a contact email address can't be read",
    [fc.uuid(), fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })],
    ([commentId, comment]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.result(_.CheckIfUserHasAVerifiedEmailAddress(commentId))

        expect(actual).toStrictEqual(
          Result.fail(new Comments.UnableToCheckForAVerifiedEmailAddress({ cause: new Queries.UnableToQuery({}) })),
        )
      }).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => new Queries.UnableToQuery({}) }),
          Layer.succeed(Comments.HandleCommentCommand, shouldNotBeCalled),
        ]),
      ),
  )

  it.effect.prop(
    "when the comment can't be updated",
    [
      fc.uuid(),
      fc.commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) }),
      fc.verifiedContactEmailAddress(),
      fc.oneof(fc.constant(new UnableToHandleCommand({})), fc.commentError()),
    ],
    ([commentId, comment, verifiedEmailAddress, error]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.result(_.CheckIfUserHasAVerifiedEmailAddress(commentId))

        expect(actual).toStrictEqual(Result.fail(new Comments.UnableToCheckForAVerifiedEmailAddress({ cause: error })))
      }).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => Effect.succeed(verifiedEmailAddress) }),
          Layer.succeed(Comments.HandleCommentCommand, () => error),
        ]),
      ),
  )
})
