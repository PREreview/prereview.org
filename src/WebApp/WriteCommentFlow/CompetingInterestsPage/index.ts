import { Effect, Equal, Match, Option, pipe } from 'effect'
import * as Comments from '../../../Domain/Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../Routes.ts'
import * as CompetingInterestsForm from './CompetingInterestsForm.ts'
import { CompetingInterestsPage as MakeResponse } from './CompetingInterestsPage.ts'

export const CompetingInterestsPage: (input: {
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> = Effect.fn('WriteCommentFlow.CompetingInterestsPage')(
  function* ({ commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return Match.valueTags(comment, {
      CommentInProgress: comment =>
        MakeResponse({
          commentId,
          form: CompetingInterestsForm.fromComment(comment),
          locale,
        }),
      CommentReadyForPublishing: comment =>
        MakeResponse({
          commentId,
          form: CompetingInterestsForm.fromComment(comment),
          locale,
        }),
      CommentBeingPublished: () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) }),
      CommentPublished: () => Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) }),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCompetingInterests.href({ commentId }) })),
    }),
)

export const CompetingInterestsSubmission: (input: {
  body: unknown
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Comments.GetNextExpectedCommandForUserOnAComment | Locale
> = Effect.fn('WriteCommentFlow.CompetingInterestsSubmission')(
  function* ({ body, commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag(
        'CommentInProgress',
        'CommentReadyForPublishing',
        Effect.fnUntraced(function* () {
          const form = yield* CompetingInterestsForm.fromBody(body)

          return yield* Match.valueTags(form, {
            CompletedFormYes: Effect.fnUntraced(function* (form) {
              const handleCommand = yield* Comments.HandleCommentCommand

              yield* pipe(
                handleCommand(
                  new Comments.DeclareCompetingInterests({
                    commentId,
                    competingInterests: Option.some(form.competingInterestsDetails),
                  }),
                ),
                Effect.catchIf(
                  cause => cause._tag !== 'UnableToHandleCommand',
                  cause => new Comments.UnableToHandleCommand({ cause }),
                ),
              )

              const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
              const nextCommand = yield* Effect.flatMap(
                getNextExpectedCommandForUserOnAComment(commentId),
                Effect.fromResult,
              )

              return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
            }),
            CompletedFormNo: Effect.fnUntraced(function* () {
              const handleCommand = yield* Comments.HandleCommentCommand

              yield* pipe(
                handleCommand(new Comments.DeclareCompetingInterests({ commentId, competingInterests: Option.none() })),
                Effect.catchIf(
                  cause => cause._tag !== 'UnableToHandleCommand',
                  cause => new Comments.UnableToHandleCommand({ cause }),
                ),
              )

              const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
              const nextCommand = yield* Effect.flatMap(
                getNextExpectedCommandForUserOnAComment(commentId),
                Effect.fromResult,
              )

              return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
            }),
            InvalidForm: form =>
              Effect.succeed(
                MakeResponse({
                  commentId,
                  form,
                  locale,
                }),
              ),
          })
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCompetingInterests.href({ commentId }) })),
    }),
)
