import type { UrlParams } from 'effect/http'
import { Array, Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as AddInvitationToAppearForm from './AddInvitationToAppearForm.ts'
import { AddInvitationToAppearPage as createAddInvitationToAppearPage } from './AddInvitationToAppearPage.ts'

export const AddInvitationToAppearPage: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.AddInvitationToAppearPage',
)(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    yield* DatasetReviews.checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList({
      datasetReviewId,
      authorId: user.orcid,
    })

    const otherAuthors = yield* Effect.map(
      DatasetReviews.getListOfInvitationsToAppearOnADatasetReview({ datasetReviewId }),
      Array.isReadonlyArrayNonEmpty,
    )

    return createAddInvitationToAppearPage({
      datasetReviewId,
      form: new AddInvitationToAppearForm.EmptyForm(),
      locale,
      otherAuthors,
    })
  },
  (effect, { datasetReviewId }) =>
    Effect.catchTags(effect, {
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

export const AddInvitationToAppearSubmission: (input: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Uuid.GenerateUuid
> = Effect.fn('ReviewADatasetFlow.AddInvitationToAppearSubmission')(function* ({ body, datasetReviewId }) {
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

        return Response.RedirectResponse({
          location: Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId }),
        })
      },
      Effect.catch(() => HavingProblemsPage),
    ),
    InvalidForm: Effect.fnUntraced(
      function* (form: AddInvitationToAppearForm.InvalidForm) {
        const otherAuthors = yield* Effect.map(
          DatasetReviews.getListOfInvitationsToAppearOnADatasetReview({ datasetReviewId }),
          Array.isReadonlyArrayNonEmpty,
        )

        return createAddInvitationToAppearPage({ datasetReviewId, form, locale, otherAuthors })
      },
      Effect.catch(() => HavingProblemsPage),
    ),
  })
})
