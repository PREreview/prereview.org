import { Effect, Equal, Match, Option, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { RouteForCommand } from '../Routes.js'
import * as CompetingInterestsForm from './CompetingInterestsForm.js'
import { CompetingInterestsPage as MakeResponse } from './CompetingInterestsPage.js'

export const CompetingInterestsPage = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', comment =>
        MakeResponse({
          commentId,
          form: CompetingInterestsForm.fromComment(comment),
          locale,
        }),
      ),
      Match.tag('CommentReadyForPublishing', comment =>
        MakeResponse({
          commentId,
          form: CompetingInterestsForm.fromComment(comment),
          locale,
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) }),
      ),
      Match.tag('CommentPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCompetingInterests.href({ commentId }) })),
    }),
  )

export const CompetingInterestsSubmission = ({
  body,
  commentId,
}: {
  body: unknown
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Comments.GetNextExpectedCommandForUserOnAComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', 'CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const form = yield* CompetingInterestsForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedFormYes', form =>
              Effect.gen(function* () {
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
                const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

                return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
              }),
            ),
            Match.tag('CompletedFormNo', () =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleCommentCommand

                yield* pipe(
                  handleCommand(
                    new Comments.DeclareCompetingInterests({ commentId, competingInterests: Option.none() }),
                  ),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
                const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

                return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  commentId,
                  form,
                  locale,
                }),
              ),
            ),
            Match.exhaustive,
          )
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
  }).pipe(
    Effect.catchTags({
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCompetingInterests.href({ commentId }) })),
    }),
  )
