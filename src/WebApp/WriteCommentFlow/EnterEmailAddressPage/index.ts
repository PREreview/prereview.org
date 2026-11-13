import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../../Domain/Comments/index.ts'
import type * as ContactEmailAddress from '../../../Domain/ContactEmailAddresses/index.ts'
import { ContactEmailAddresses } from '../../../Domain/ContactEmailAddresses/index.ts'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../Routes.ts'
import * as EnterEmailAddressForm from './EnterEmailAddressForm.ts'
import { EnterEmailAddressPage as MakeResponse } from './EnterEmailAddressPage.ts'

export const EnterEmailAddressPage: (input: {
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Comments.GetComment
  | Comments.GetNextExpectedCommandForUserOnAComment
  | Comments.HandleCommentCommand
  | ContactEmailAddresses
  | Locale
> = Effect.fn('WriteCommentFlow.EnterEmailAddressPage')(
  function* ({ commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* Match.valueTags(comment, {
      CommentInProgress: Effect.fnUntraced(function* (comment) {
        if (comment.verifiedEmailAddressExists) {
          const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
          const nextCommand = yield* Effect.flatMap(
            getNextExpectedCommandForUserOnAComment(commentId),
            Effect.fromResult,
          )

          return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
        }

        const contactEmailAddresses = yield* ContactEmailAddresses

        return yield* pipe(
          contactEmailAddresses.getContactEmailAddress(comment.authorId),
          Effect.andThen(
            pipe(
              Match.type<ContactEmailAddress.ContactEmailAddress>(),
              Match.tag(
                'VerifiedContactEmailAddress',
                Effect.fnUntraced(function* () {
                  const handleCommand = yield* Comments.HandleCommentCommand

                  yield* pipe(
                    handleCommand(new Comments.ConfirmExistenceOfVerifiedEmailAddress({ commentId })),
                    Effect.catchIf(
                      cause => cause._tag !== 'UnableToHandleCommand',
                      cause => new Comments.UnableToHandleCommand({ cause }),
                    ),
                  )

                  const getNextExpectedCommandForUserOnAComment =
                    yield* Comments.GetNextExpectedCommandForUserOnAComment
                  const nextCommand = yield* Effect.flatMap(
                    getNextExpectedCommandForUserOnAComment(commentId),
                    Effect.fromResult,
                  )

                  return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
                }),
              ),
              Match.tag('UnverifiedContactEmailAddress', contactEmailAddress =>
                Effect.succeed(
                  MakeResponse({
                    commentId,
                    form: new EnterEmailAddressForm.CompletedForm({ emailAddress: contactEmailAddress.value }),
                    locale,
                  }),
                ),
              ),
              Match.exhaustive,
            ),
          ),
          Effect.catchTag('ContactEmailAddressIsNotFound', () =>
            Effect.succeed(
              MakeResponse({
                commentId,
                form: new EnterEmailAddressForm.EmptyForm(),
                locale,
              }),
            ),
          ),
        )
      }),
      CommentReadyForPublishing: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
      CommentBeingPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      CommentPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
)

export const EnterEmailAddressSubmission: (input: {
  body: unknown
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | ContactEmailAddresses | Locale
> = Effect.fn('WriteCommentFlow.EnterEmailAddressSubmission')(
  function* ({ body, commentId }) {
    const contactEmailAddresses = yield* ContactEmailAddresses
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* Match.valueTags(comment, {
      CommentInProgress: Effect.fnUntraced(function* () {
        const form = yield* EnterEmailAddressForm.fromBody(body)

        if (form._tag === 'InvalidForm') {
          return MakeResponse({ commentId, form, locale })
        }

        yield* contactEmailAddresses.startVerificationOfContactEmailAddress({
          orcidId: user.orcid,
          emailAddress: form.emailAddress,
          resumeAt: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
        })

        return Response.RedirectResponse({
          location: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
        })
      }),
      CommentReadyForPublishing: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
      CommentBeingPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      CommentPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      ContactEmailAddressHasAlreadyBeenVerified: () =>
        Effect.succeed(
          Response.RedirectResponse({
            location: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
          }),
        ),
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
)
