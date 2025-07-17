import type { UrlParams } from '@effect/platform'
import { Effect, Equal, Match } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import * as FollowsFairAndCarePrinciplesForm from './FollowsFairAndCarePrinciplesForm.js'
import { FollowsFairAndCarePrinciplesQuestion as MakeResponse } from './FollowsFairAndCarePrinciplesQuestion.js'

export const FollowsFairAndCarePrinciplesQuestion = ({
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
      DatasetReviews.getAnswerToIfTheDatasetFollowsFairAndCarePrinciples(datasetReviewId),
      FollowsFairAndCarePrinciplesForm.fromAnswer,
    )

    return MakeResponse({ datasetReviewId, form })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasBeenPublished: () => HavingProblemsPage,
      DatasetReviewIsBeingPublished: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )

export const FollowsFairAndCarePrinciplesSubmission = ({
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
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    const form = yield* FollowsFairAndCarePrinciplesForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: FollowsFairAndCarePrinciplesForm.CompletedForm) {
          yield* DatasetReviews.answerIfTheDatasetFollowsFairAndCarePrinciples({
            answer: form.followsFairAndCarePrinciples,
            datasetReviewId,
          })

          return yield* HavingProblemsPage
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
      InvalidForm: form => Effect.succeed(MakeResponse({ datasetReviewId, form })),
    })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
