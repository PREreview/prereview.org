import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import type { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import { LoggedInUser } from '../../user.ts'
import * as DeclareFollowingCodeOfConductForm from './DeclareFollowingCodeOfConductForm.ts'
import { DeclareFollowingCodeOfConductPage as MakeResponse } from './DeclareFollowingCodeOfConductPage.ts'

export const DeclareFollowingCodeOfConductPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const hasBeenDeclared = yield* DatasetReviews.checkIfUserCanDeclareFollowingCodeOfConduct({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = DeclareFollowingCodeOfConductForm.fromHasBeenDeclared(hasBeenDeclared)

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

export const DeclareFollowingCodeOfConductSubmission = ({
  body,
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, Locale> =>
  Effect.gen(function* () {
    const form = yield* DeclareFollowingCodeOfConductForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: () => HavingProblemsPage,
      InvalidForm: form => Effect.succeed(MakeResponse({ datasetReviewId, form })),
    })
  })
