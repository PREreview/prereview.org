import { Array, Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type * as Response from '../../Response/index.ts'
import { RedirectResponse } from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import { CheckInvitationsToAppearPage as createCheckInvitationsToAppearPage } from './CheckInvitationsToAppearPage.ts'

export const CheckInvitationsToAppearPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    yield* DatasetReviews.checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList({
      datasetReviewId,
      authorId: user.orcid,
    })

    const authors = yield* DatasetReviews.getListOfInvitationsToAppearOnADatasetReview({ datasetReviewId })

    if (!Array.isNonEmptyReadonlyArray(authors)) {
      return RedirectResponse({ location: Routes.ReviewADatasetAddInvitationToAppear.href({ datasetReviewId }) })
    }

    return createCheckInvitationsToAppearPage({ datasetReviewId, authors, locale })
  }).pipe(
    Effect.catchTags({
      DatasetReviewDoesNotNeedInvitationsToAppear: () =>
        Effect.succeed(
          RedirectResponse({
            location: Routes.ReviewADatasetOthersNeedToBeListedOnTheReview.href({ datasetReviewId }),
          }),
        ),
      DatasetReviewHasNotBeenStarted: () => PageNotFound,
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) })),
      DatasetReviewIsBeingPublished: () =>
        Effect.succeed(
          RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewWasStartedByAnotherUser: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const CheckInvitationsToAppearSubmission = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const nextExpectedCommand = yield* Effect.flatten(
      DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
    )

    return RedirectResponse({
      location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
    })
  }).pipe(Effect.catchAll(() => HavingProblemsPage))
