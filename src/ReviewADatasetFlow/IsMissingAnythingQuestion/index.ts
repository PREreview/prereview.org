import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import type { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../response.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import { LoggedInUser } from '../../user.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as IsMissingAnythingForm from './IsMissingAnythingForm.ts'
import { IsMissingAnythingQuestion as MakeResponse } from './IsMissingAnythingQuestion.ts'

export const IsMissingAnythingQuestion = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const currentAnswer = yield* DatasetReviews.checkIfUserCanAnswerIfTheDatasetIsMissingAnything({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = IsMissingAnythingForm.fromAnswer(currentAnswer)

    return MakeResponse({ datasetReviewId, form })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasNotBeenStarted: () => PageNotFound,
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewIsBeingPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewWasStartedByAnotherUser: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const IsMissingAnythingSubmission = ({
  body,
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const form = yield* IsMissingAnythingForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: IsMissingAnythingForm.CompletedForm) {
          yield* DatasetReviews.answerIfTheDatasetIsMissingAnything({
            answer: form.isMissingAnything,
            datasetReviewId,
            userId: user.orcid,
          })

          const nextExpectedCommand = yield* Effect.flatten(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          )

          return Response.RedirectResponse({
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
    })
  })
