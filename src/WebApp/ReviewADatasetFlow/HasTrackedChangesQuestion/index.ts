import type { UrlParams } from 'effect/http'
import { Effect, Match, Option, pipe } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { NonEmptyString, Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as HasTrackedChangesForm from './HasTrackedChangesForm.ts'
import { HasTrackedChangesQuestion as MakeResponse } from './HasTrackedChangesQuestion.ts'

export const HasTrackedChangesQuestion: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.HasTrackedChangesQuestion',
)(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const currentAnswer = yield* DatasetReviews.checkIfUserCanAnswerIfTheDatasetHasTrackedChanges({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = HasTrackedChangesForm.fromAnswer(currentAnswer)

    return MakeResponse({ datasetReviewId, form, locale })
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

export const HasTrackedChangesSubmission: (input: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> = Effect.fn('ReviewADatasetFlow.HasTrackedChangesSubmission')(function* ({ body, datasetReviewId }) {
  const user = yield* LoggedInUser
  const locale = yield* Locale

  const form = yield* HasTrackedChangesForm.fromBody(body)

  return yield* Match.valueTags(form, {
    CompletedForm: Effect.fnUntraced(
      function* (form: HasTrackedChangesForm.CompletedForm) {
        yield* DatasetReviews.answerIfTheDatasetHasTrackedChanges({
          answer: form.hasTrackedChanges,
          detail: pipe(
            Match.value(form.hasTrackedChanges),
            Match.when('yes', () => form.hasTrackedChangesYesDetail),
            Match.when('partly', () => form.hasTrackedChangesPartlyDetail),
            Match.when('no', () => form.hasTrackedChangesNoDetail),
            Match.when('unsure', Option.none<NonEmptyString.NonEmptyString>),
            Match.exhaustive,
          ),
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
    InvalidForm: form => Effect.succeed(MakeResponse({ datasetReviewId, form, locale })),
  })
})
