import type { UrlParams } from '@effect/platform'
import { Effect, Equal, Match } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import * as HasTrackedChangesForm from './HasTrackedChangesForm.js'
import { HasTrackedChangesQuestion as MakeResponse } from './HasTrackedChangesQuestion.js'

export const HasTrackedChangesQuestion = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    yield* DatasetReviews.checkIfReviewIsInProgress(datasetReviewId)

    const form = yield* Effect.andThen(
      DatasetReviews.getAnswerToIfTheDatasetHasTrackedChanges(datasetReviewId),
      HasTrackedChangesForm.fromAnswer,
    )

    return MakeResponse({ datasetReviewId, form })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewIsBeingPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
        ),
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )

export const HasTrackedChangesSubmission = ({
  body,
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    const form = yield* HasTrackedChangesForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: () => HavingProblemsPage,
      InvalidForm: form => Effect.succeed(MakeResponse({ datasetReviewId, form })),
    })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
