import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as RemoveInvitationToAppearForm from './RemoveInvitationToAppearForm.ts'
import { RemoveInvitationToAppearPage as createRemoveInvitationToAppearPage } from './RemoveInvitationToAppearPage.ts'

export const RemoveInvitationToAppearPage = ({
  datasetReviewId,
  invitationId,
}: {
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const authorName = yield* DatasetReviews.checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList({
      datasetReviewId,
      invitationId,
      authorId: user.orcid,
    })

    return createRemoveInvitationToAppearPage({
      authorName,
      datasetReviewId,
      invitationId,
      form: new RemoveInvitationToAppearForm.EmptyForm(),
      locale,
    })
  }).pipe(
    Effect.catchTags({
      DatasetReviewDoesNotNeedInvitationsToAppear: () =>
        Effect.succeed(
          Response.RedirectResponse({
            location: Routes.ReviewADatasetOthersNeedToBeListedOnTheReview.href({ datasetReviewId }),
          }),
        ),
      DatasetReviewInvitationNotInList: () =>
        Effect.succeed(
          Response.RedirectResponse({
            location: Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId }),
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

export const RemoveInvitationToAppearSubmission = ({
  body,
  datasetReviewId,
  invitationId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const form = yield* RemoveInvitationToAppearForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(
        function* (form: RemoveInvitationToAppearForm.CompletedForm) {
          if (form.removeAuthor === 'yes') {
            yield* DatasetReviews.removeInvitationToAppearFromTheList({
              datasetReviewId,
              invitationId,
              userId: user.orcid,
            })
          }

          return Response.RedirectResponse({
            location: Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId }),
          })
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
      InvalidForm: Effect.fnUntraced(
        function* () {
          const authorName = yield* DatasetReviews.checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList({
            datasetReviewId,
            invitationId,
            authorId: user.orcid,
          })

          return createRemoveInvitationToAppearPage({ authorName, datasetReviewId, invitationId, form, locale })
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
    })
  })
