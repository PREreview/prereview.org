import { Array, Effect, Option, Record } from 'effect'
import * as Uuid from 'uuid-ts'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import type * as Response from '../../response.js'
import { EnsureUserIsLoggedIn } from '../../user.js'

export const StartNow = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse,
  never,
  GetPrereview | Feedback.HandleFeedbackCommand | Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteFeedback

    const getPrereview = yield* GetPrereview

    const prereview = yield* getPrereview(id)

    const query = yield* Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview

    const unpublishedFeedback = yield* query({ authorId: user.orcid, prereviewId: prereview.id })

    const existingFeedbackId = Array.head(Record.keys(unpublishedFeedback))

    return yield* Option.match(existingFeedbackId, {
      onNone: () =>
        Effect.gen(function* () {
          const feedbackId = yield* Effect.sync(Uuid.v4())

          const handleCommand = yield* Feedback.HandleFeedbackCommand

          yield* handleCommand({
            feedbackId,
            command: new Feedback.StartFeedback({ authorId: user.orcid, prereviewId: prereview.id }),
          })

          return havingProblemsPage
        }),
      onSome: () => Effect.succeed(havingProblemsPage),
    })
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteFeedback: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
    Effect.orElseSucceed(() => havingProblemsPage),
  )
