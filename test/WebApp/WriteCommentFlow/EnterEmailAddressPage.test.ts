import { it } from '@effect/vitest'
import { Effect, Either, Equal, Layer } from 'effect'
import { describe, expect, vi } from 'vitest'
import * as Comments from '../../../src/Comments/index.ts'
import * as ContactEmailAddress from '../../../src/contact-email-address.ts'
import { Locale } from '../../../src/Context.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/EnterEmailAddressPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/WriteCommentFlow/Routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('EnterEmailAddressPage', () => {
  describe('when there is a user', () => {
    describe('when the comment is in progress', () => {
      describe("when there isn't a confirmed verified email address", () => {
        it.effect.prop(
          'when there is a verified email address',
          [
            fc.uuid(),
            fc
              .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
            fc.verifiedContactEmailAddress(),
            fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
          ],
          ([commentId, [comment, user], locale, contactEmailAddress, nextCommand]) =>
            Effect.gen(function* () {
              const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)
              const getNextExpectedCommandForUserOnAComment = vi.fn<
                typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
              >(_ => Effect.succeed(Either.right(nextCommand)))

              const actual = yield* _.EnterEmailAddressPage({ commentId }).pipe(
                Effect.provideService(Comments.HandleCommentCommand, handleCommentCommand),
                Effect.provideService(
                  Comments.GetNextExpectedCommandForUserOnAComment,
                  getNextExpectedCommandForUserOnAComment,
                ),
              )

              expect(actual).toStrictEqual({
                _tag: 'RedirectResponse',
                status: StatusCodes.SeeOther,
                location: RouteForCommand(nextCommand).href({ commentId }),
              })

              expect(handleCommentCommand).toHaveBeenCalledWith(
                new Comments.ConfirmExistenceOfVerifiedEmailAddress({ commentId }),
              )
              expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
                Effect.succeed(contactEmailAddress),
              ),
              Effect.provideService(LoggedInUser, user),
            ),
        )

        it.effect.prop(
          'when there is an unverified email address',
          [
            fc.uuid(),
            fc
              .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
            fc.unverifiedContactEmailAddress(),
          ],
          ([commentId, [comment, user], locale, contactEmailAddress]) =>
            Effect.gen(function* () {
              const actual = yield* _.EnterEmailAddressPage({ commentId })

              expect(actual).toStrictEqual({
                _tag: 'StreamlinePageResponse',
                canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
                status: StatusCodes.OK,
                title: expect.anything(),
                nav: expect.anything(),
                main: expect.anything(),
                skipToLabel: 'form',
                js: [],
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
              Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
              Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
                Effect.succeed(contactEmailAddress),
              ),
              Effect.provideService(LoggedInUser, user),
            ),
        )

        it.effect.prop(
          "when there isn't an email address",
          [
            fc.uuid(),
            fc
              .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
          ],
          ([commentId, [comment, user], locale]) =>
            Effect.gen(function* () {
              const actual = yield* _.EnterEmailAddressPage({ commentId })

              expect(actual).toStrictEqual({
                _tag: 'StreamlinePageResponse',
                canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
                status: StatusCodes.OK,
                title: expect.anything(),
                nav: expect.anything(),
                main: expect.anything(),
                skipToLabel: 'form',
                js: [],
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
              Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
              Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
                Effect.fail(new ContactEmailAddress.ContactEmailAddressIsNotFound()),
              ),
              Effect.provideService(LoggedInUser, user),
            ),
        )

        it.effect.prop(
          "when there the email address can't be checked",
          [
            fc.uuid(),
            fc
              .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
          ],
          ([commentId, [comment, user], locale]) =>
            Effect.gen(function* () {
              const actual = yield* _.EnterEmailAddressPage({ commentId })

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
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
              Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
              Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
                Effect.fail(new ContactEmailAddress.ContactEmailAddressIsUnavailable({})),
              ),
              Effect.provideService(LoggedInUser, user),
            ),
        )
      })

      it.effect.prop(
        'when there is a confirmed verified email address',
        [
          fc.uuid(),
          fc
            .commentInProgress({ verifiedEmailAddressExists: fc.constant(true) })
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
        ],
        ([commentId, [comment, user], locale, nextCommand]) =>
          Effect.gen(function* () {
            const getNextExpectedCommandForUserOnAComment = vi.fn<
              typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
            >(_ => Effect.succeed(Either.right(nextCommand)))

            const actual = yield* Effect.provideService(
              _.EnterEmailAddressPage({ commentId }),
              Comments.GetNextExpectedCommandForUserOnAComment,
              getNextExpectedCommandForUserOnAComment,
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: RouteForCommand(nextCommand).href({ commentId }),
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
            Effect.provideService(LoggedInUser, user),
          ),
      )
    })

    it.effect.prop(
      'when the comment is ready for publishing',
      [
        fc.uuid(),
        fc
          .commentReadyForPublishing()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentCheck.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment has been published',
      [
        fc.uuid(),
        fc
          .commentPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublished.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is being published',
      [
        fc.uuid(),
        fc
          .commentBeingPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublishing.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment hasn't been started",
      [fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()],
      ([commentId, comment, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is by a different author',
      [
        fc.uuid(),
        fc
          .tuple(fc.commentState(), fc.user())
          .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment can't be loaded",
      [fc.uuid(), fc.user(), fc.supportedLocale()],
      ([commentId, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

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
          Effect.provideService(Comments.GetComment, () => new Queries.UnableToQuery({})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })

  it.effect.prop("when there isn't a user", [fc.uuid(), fc.supportedLocale()], ([commentId, locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.EnterEmailAddressPage({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
    ),
  )
})

describe('EnterEmailAddressSubmission', () => {
  describe('when there is a user', () => {
    describe('when the comment is in progress', () => {
      describe('when there is an email address', () => {
        it.effect.prop(
          'when there is an email address',
          [
            fc.uuid(),
            fc
              .commentInProgress()
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.publicPersona(),
            fc.supportedLocale(),
            fc.record({ emailAddress: fc.emailAddress() }),
            fc.uuid(),
          ],
          ([commentId, [comment, user], publicPersona, locale, body, uuid]) =>
            Effect.gen(function* () {
              const saveContactEmailAddress = vi.fn<typeof ContactEmailAddress.SaveContactEmailAddress.Service>(
                _ => Effect.void,
              )
              const verifyContactEmailAddressForComment = vi.fn<
                typeof ContactEmailAddress.VerifyContactEmailAddressForComment.Service
              >(_ => Effect.void)

              const actual = yield* _.EnterEmailAddressSubmission({ body, commentId }).pipe(
                Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, saveContactEmailAddress),
                Effect.provideService(
                  ContactEmailAddress.VerifyContactEmailAddressForComment,
                  verifyContactEmailAddressForComment,
                ),
              )

              expect(actual).toStrictEqual({
                _tag: 'RedirectResponse',
                status: StatusCodes.SeeOther,
                location: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
              })
              expect(saveContactEmailAddress).toHaveBeenCalledWith(
                user.orcid,
                new ContactEmailAddress.UnverifiedContactEmailAddress({
                  value: body.emailAddress,
                  verificationToken: uuid,
                }),
              )
              expect(verifyContactEmailAddressForComment).toHaveBeenCalledWith(
                publicPersona.name,
                new ContactEmailAddress.UnverifiedContactEmailAddress({
                  value: body.emailAddress,
                  verificationToken: uuid,
                }),
                commentId,
              )
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provide([
                Layer.mock(Personas.Personas, { getPublicPersona: () => Effect.succeed(publicPersona) }),
                Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
              ]),
              Effect.provideService(LoggedInUser, user),
            ),
        )
      })

      it.effect.prop(
        "when there isn't an email address",
        [
          fc.uuid(),
          fc
            .commentInProgress()
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ emailAddress: fc.string().filter(string => !string.includes('@')) }, { requiredKeys: [] }),
            fc
              .anything()
              .filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'emailAddress'))),
          ),
        ],
        ([commentId, [comment, user], locale, body]) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
              status: StatusCodes.BadRequest,
              title: expect.anything(),
              nav: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'form',
              js: ['error-summary.js'],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
            Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
            Effect.provideService(LoggedInUser, user),
          ),
      )
    })

    it.effect.prop(
      'when the comment is ready for publishing',
      [
        fc.uuid(),
        fc
          .commentReadyForPublishing()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentCheck.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment has been published',
      [
        fc.uuid(),
        fc
          .commentPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublished.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is being published',
      [
        fc.uuid(),
        fc
          .commentBeingPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublishing.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment hasn't been started",
      [fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale(), fc.anything()],
      ([commentId, comment, user, locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is by a different author',
      [
        fc.uuid(),
        fc
          .tuple(fc.commentState(), fc.user())
          .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment can't be loaded",
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.anything()],
      ([commentId, user, locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

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
          Effect.provideService(Comments.GetComment, () => new Queries.UnableToQuery({})),
          Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
          Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })

  it.effect.prop(
    "when there isn't a user",
    [fc.uuid(), fc.supportedLocale(), fc.anything()],
    ([commentId, locale, body]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ body, commentId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.SaveContactEmailAddress, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.VerifyContactEmailAddressForComment, shouldNotBeCalled),
        Effect.provide([Layer.mock(Personas.Personas, {}), Layer.mock(Uuid.GenerateUuid, {})]),
      ),
  )
})
