import { Array, Effect, Option, Record } from 'effect'
import { Locale } from '../../Context.js'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import * as Feedback from '../../Feedback/index.js'
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
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  | Uuid.GenerateUuid
  | GetPrereview
  | Feedback.HandleFeedbackCommand
  | Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteFeedback

    const getPrereview = yield* GetPrereview

    const prereview = yield* getPrereview(id)

    const query = yield* Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview

    const unpublishedFeedback = yield* query({ authorId: user.orcid, prereviewId: prereview.id })

    const existingFeedback = Array.head(Record.toEntries(unpublishedFeedback))

    return yield* Option.match(existingFeedback, {
      onNone: () =>
        Effect.gen(function* () {
          const generateUuid = yield* Uuid.GenerateUuid
          const feedbackId = yield* generateUuid

          const handleCommand = yield* Feedback.HandleFeedbackCommand

          yield* handleCommand({
            feedbackId,
            command: new Feedback.StartFeedback({ authorId: user.orcid, prereviewId: prereview.id }),
          })

          return Response.RedirectResponse({ location: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }) })
        }),
      onSome: ([feedbackId, feedback]) =>
        Effect.gen(function* () {
          const locale = yield* Locale
          const nextPage = DecideNextPage.NextPageFromState(feedback)

          return CarryOnPage({ feedbackId, nextPage, prereview, locale })
        }),
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
