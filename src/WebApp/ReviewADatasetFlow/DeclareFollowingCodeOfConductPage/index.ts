import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import type { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import { Temporal, type Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
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
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const form = yield* DeclareFollowingCodeOfConductForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* () {
          yield* DatasetReviews.declareFollowingCodeOfConduct({
            timestamp: yield* Temporal.currentInstant,
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
