import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as AddInvitationToAppearForm from './AddInvitationToAppearForm.ts'
import { AddInvitationToAppearPage as createAddInvitationToAppearPage } from './AddInvitationToAppearPage.ts'

export const AddInvitationToAppearPage = ({
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

    return createAddInvitationToAppearPage({ datasetReviewId, form: new AddInvitationToAppearForm.EmptyForm(), locale })
  }).pipe(
    Effect.catchTags({
      DatasetReviewDoesNotNeedInvitationsToAppear: () =>
        Effect.succeed(
          Response.RedirectResponse({
            location: Routes.ReviewADatasetOthersNeedToBeListedOnTheReview.href({ datasetReviewId }),
          }),
        ),
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

export const AddInvitationToAppearSubmission = ({
  body,
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Uuid.GenerateUuid
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const form = AddInvitationToAppearForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(
        function* (form: AddInvitationToAppearForm.CompletedForm) {
          yield* DatasetReviews.addInvitationToAppearToTheList({
            datasetReviewId,
            name: form.name,
            emailAddress: form.emailAddress,
            invitationId: yield* Uuid.v4(),
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
      InvalidForm: form => Effect.succeed(createAddInvitationToAppearPage({ datasetReviewId, form, locale })),
    })
  })
