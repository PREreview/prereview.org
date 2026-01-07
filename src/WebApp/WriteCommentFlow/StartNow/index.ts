import { Effect, Match, pipe } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Prereviews from '../../../Prereviews/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RouteForCommand } from '../Routes.ts'
import { CarryOnPage } from './CarryOnPage.ts'

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

    const prereview = yield* Prereviews.getPrereview(id)

    const getNextExpectedCommandForUser = yield* Comments.GetNextExpectedCommandForUser

    const nextCommand = yield* getNextExpectedCommandForUser({
      authorId: user.orcid,
      prereviewId: prereview.id,
    })

    return yield* pipe(
      Match.value(nextCommand),
      Match.tag('ExpectedToStartAComment', () =>
        Effect.gen(function* () {
          const commentId = yield* Uuid.generateUuid

          const handleCommand = yield* Comments.HandleCommentCommand
          const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment

          yield* handleCommand(
            new Comments.StartComment({ commentId, authorId: user.orcid, prereviewId: prereview.id }),
          )

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
