import type { UrlParams } from '@effect/platform'
import { Effect, Match, Option, pipe } from 'effect'
import type { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { NonEmptyString, Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as IsDetailedEnoughForm from './IsDetailedEnoughForm.ts'
import { IsDetailedEnoughQuestion as MakeResponse } from './IsDetailedEnoughQuestion.ts'

export const IsDetailedEnoughQuestion = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const currentAnswer = yield* DatasetReviews.checkIfUserCanAnswerIfTheDatasetIsDetailedEnough({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = IsDetailedEnoughForm.fromAnswer(currentAnswer)

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

export const IsDetailedEnoughSubmission = ({
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

    const form = yield* IsDetailedEnoughForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: IsDetailedEnoughForm.CompletedForm) {
          yield* DatasetReviews.answerIfTheDatasetIsDetailedEnough({
            answer: form.isDetailedEnough,
            detail: pipe(
              Match.value(form.isDetailedEnough),
              Match.when('yes', () => form.isDetailedEnoughYesDetail),
              Match.when('partly', () => form.isDetailedEnoughPartlyDetail),
              Match.when('no', () => form.isDetailedEnoughNoDetail),
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
