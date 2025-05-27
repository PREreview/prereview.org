import { Effect, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Prereviews from '../../Prereviews/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { RouteForCommand } from '../Routes.js'
import { CarryOnPage } from './CarryOnPage.js'

export const StartNow = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Uuid.GenerateUuid
  | Prereviews.Prereviews
  | Comments.HandleCommentCommand
  | Comments.GetNextExpectedCommandForUser
  | Comments.GetNextExpectedCommandForUserOnAComment
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const prereviews = yield* Prereviews.Prereviews

    const prereview = yield* prereviews.getPrereview(id)

    const getNextExpectedCommandForUser = yield* Comments.GetNextExpectedCommandForUser

    const nextCommand = yield* getNextExpectedCommandForUser({
      authorId: user.orcid,
      prereviewId: prereview.id,
    })

    return yield* pipe(
      Match.value(nextCommand),
      Match.tag('ExpectedToStartAComment', () =>
        Effect.gen(function* () {
          const generateUuid = yield* Uuid.GenerateUuid
          const commentId = yield* generateUuid

          const handleCommand = yield* Comments.HandleCommentCommand
          const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment

          yield* handleCommand({
            commentId,
            command: new Comments.StartComment({ authorId: user.orcid, prereviewId: prereview.id }),
          })

          const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

          return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
        }),
      ),
      Match.orElse(nextCommand =>
        Effect.gen(function* () {
          const locale = yield* Locale

          return CarryOnPage({
            commentId: nextCommand.commentId,
            nextPage: RouteForCommand(nextCommand),
            prereview,
            locale,
          })
        }),
      ),
    )
  }).pipe(
    Effect.catchTags({
      PrereviewIsNotFound: () => PageNotFound,
      PrereviewIsUnavailable: () => HavingProblemsPage,
      PrereviewWasRemoved: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentStartNow.href({ id }) })),
    }),
    Effect.orElse(() => HavingProblemsPage),
  )
