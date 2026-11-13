import type { UrlParams } from 'effect/http'
import { Effect, Match, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as DeclareCompetingInterestsForm from './DeclareCompetingInterestsForm.ts'
import { DeclareCompetingInterestsPage as MakeResponse } from './DeclareCompetingInterestsPage.ts'

export const DeclareCompetingInterestsPage: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.DeclareCompetingInterestsPage',
)(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const currentCompetingInterests = yield* DatasetReviews.checkIfUserCanDeclareCompetingInterests({
      datasetReviewId,
      userId: user.orcid,
    })

    const otherAuthors = yield* DatasetReviews.areThereMultipleAuthorsOnAReview(datasetReviewId)

    const form = DeclareCompetingInterestsForm.fromCompetingInterests(currentCompetingInterests)

    return MakeResponse({
      datasetReviewId,
      form,
      locale,
      otherAuthors,
    })
  },
  (effect, { datasetReviewId }) =>
    Effect.catchTags(effect, {
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

export const DeclareCompetingInterestsSubmission: (input: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> = Effect.fn('ReviewADatasetFlow.DeclareCompetingInterestsSubmission')(function* ({ body, datasetReviewId }) {
  const user = yield* LoggedInUser
  const locale = yield* Locale

  const form = yield* DeclareCompetingInterestsForm.fromBody(body)

  return yield* Match.valueTags(form, {
    CompletedForm: Effect.fnUntraced(
      function* (form: DeclareCompetingInterestsForm.CompletedForm) {
        yield* DatasetReviews.declareCompetingInterests({
          competingInterests: form.declareCompetingInterests === 'yes' ? form.competingInterestsDetails : Option.none(),
          datasetReviewId,
          userId: user.orcid,
        })

        const nextExpectedCommand = yield* Effect.flatMap(
          DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          Effect.fromOption,
        )

        return Response.RedirectResponse({
          location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
        })
      },
      Effect.catch(() => HavingProblemsPage),
    ),
    InvalidForm: Effect.fnUntraced(
      function* (form: DeclareCompetingInterestsForm.InvalidForm) {
        const otherAuthors = yield* DatasetReviews.areThereMultipleAuthorsOnAReview(datasetReviewId)

        return MakeResponse({
          datasetReviewId,
          form,
          locale,
          otherAuthors,
        })
      },
      Effect.catchTag('UnableToQuery', () => HavingProblemsPage),
    ),
  })
})
