import type { UrlParams } from '@effect/platform'
import { Effect, Match, Option, pipe } from 'effect'
import type { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import { LoggedInUser } from '../../user.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as HasEnoughMetadataForm from './HasEnoughMetadataForm.ts'
import { HasEnoughMetadataQuestion as MakeResponse } from './HasEnoughMetadataQuestion.ts'

export const HasEnoughMetadataQuestion = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const currentAnswer = yield* DatasetReviews.checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = HasEnoughMetadataForm.fromAnswer(currentAnswer)

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

export const HasEnoughMetadataSubmission = ({
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

    const form = yield* HasEnoughMetadataForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: HasEnoughMetadataForm.CompletedForm) {
          yield* DatasetReviews.answerIfTheDatasetHasEnoughMetadata({
            answer: form.hasEnoughMetadata,
            detail: pipe(
              Match.value(form.hasEnoughMetadata),
              Match.when('yes', () => form.hasEnoughMetadataYesDetail),
              Match.when('partly', () => form.hasEnoughMetadataPartlyDetail),
              Match.when('no', () => form.hasEnoughMetadataNoDetail),
              Match.when('unsure', Option.none<NonEmptyString.NonEmptyString>),
              Match.exhaustive,
            ),
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
      InvalidForm: form => Effect.succeed(MakeResponse({ datasetReviewId, form })),
    })
  })
