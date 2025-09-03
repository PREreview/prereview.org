import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import * as IsReadyToBeSharedForm from './IsReadyToBeSharedForm.js'
import { IsReadyToBeSharedQuestion as MakeResponse } from './IsReadyToBeSharedQuestion.js'

export const IsReadyToBeSharedQuestion = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const currentAnswer = yield* DatasetReviews.checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = IsReadyToBeSharedForm.fromAnswer(currentAnswer)

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

export const IsReadyToBeSharedSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> => HavingProblemsPage
