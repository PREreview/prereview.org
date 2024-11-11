import { Array, Effect, Option, Record } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { EnsureCanWriteComments } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as DecideNextPage from '../DecideNextPage.js'
import { CarryOnPage } from './CarryOnPage.js'

export const StartNow = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Uuid.GenerateUuid
  | GetPrereview
  | Comments.HandleCommentCommand
  | Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteComments

    const getPrereview = yield* GetPrereview

    const prereview = yield* getPrereview(id)

    const query = yield* Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview

    const unpublishedComments = yield* query({ authorId: user.orcid, prereviewId: prereview.id })

    const existingComment = Array.head(Record.toEntries(unpublishedComments))

    return yield* Option.match(existingComment, {
      onNone: () =>
        Effect.gen(function* () {
          const generateUuid = yield* Uuid.GenerateUuid
          const commentId = yield* generateUuid

          const handleCommand = yield* Comments.HandleCommentCommand

          yield* handleCommand({
            commentId,
            command: new Comments.StartComment({ authorId: user.orcid, prereviewId: prereview.id }),
          })

          return Response.RedirectResponse({
            location: DecideNextPage.NextPageAfterCommand({
              command: 'StartComment',
              comment: new Comments.CommentNotStarted(),
            }).href({ commentId }),
          })
        }),
      onSome: ([commentId, comment]) =>
        Effect.gen(function* () {
          const locale = yield* Locale
          const nextPage = DecideNextPage.NextPageFromState(comment)

          return CarryOnPage({ commentId, nextPage, prereview, locale })
        }),
    })
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteComments: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentStartNow.href({ id }) })),
    }),
    Effect.orElseSucceed(() => havingProblemsPage),
  )
