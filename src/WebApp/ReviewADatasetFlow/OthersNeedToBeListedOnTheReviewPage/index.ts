import type { UrlParams } from 'effect/http'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as OthersNeedToBeListedForm from './OthersNeedToBeListedForm.ts'
import { OthersNeedToBeListedPage } from './OthersNeedToBeListedPage.ts'

export const OthersNeedToBeListedOnTheReviewPage: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.OthersNeedToBeListedOnTheReviewPage',
)(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const answer = yield* DatasetReviews.checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview({
      datasetReviewId,
      authorId: user.orcid,
    })

    const form = OthersNeedToBeListedForm.fromAnswer(answer)

    return OthersNeedToBeListedPage({ datasetReviewId, form, locale })
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

export const OthersNeedToBeListedOnTheReviewSubmission: (input: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> = Effect.fn('ReviewADatasetFlow.OthersNeedToBeListedOnTheReviewSubmission')(function* ({ body, datasetReviewId }) {
  const user = yield* LoggedInUser
  const locale = yield* Locale

  const form = yield* OthersNeedToBeListedForm.fromBody(body)

  return yield* Match.valueTags(form, {
    CompletedForm: Effect.fnUntraced(
      function* (form: OthersNeedToBeListedForm.CompletedForm) {
        yield* DatasetReviews.answerIfOthersNeedToBeListedOnTheReview({
          answer: form.othersNeedToBeListed,
          datasetReviewId,
          userId: user.orcid,
        })

        const nextExpectedCommand = yield* Effect.flatMap(
          DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          Effect.fromOption,
        )

        if (
          form.othersNeedToBeListed === 'yes' &&
          nextExpectedCommand !== 'AddInvitationToAppearOnADatasetReviewToTheList'
        ) {
          return Response.RedirectResponse({
            location: Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId }),
          })
        }

        return Response.RedirectResponse({
          location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
        })
      },
      Effect.catch(() => HavingProblemsPage),
    ),
    InvalidForm: form => Effect.succeed(OthersNeedToBeListedPage({ datasetReviewId, form, locale })),
  })
})
