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
import { RouteForCommand } from '../RouteForCommand.ts'
import * as UseOfAiForm from './UseOfAiForm.ts'
import { UseOfAiPage as MakeResponse } from './UseOfAiPage.ts'

export const UseOfAiPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const useOfAi = yield* DatasetReviews.checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas({
      datasetReviewId,
      authorId: user.orcid,
    })

    const otherAuthors = yield* DatasetReviews.areThereMultipleAuthorsOnAReview(datasetReviewId)

    const form = UseOfAiForm.fromAnswer(useOfAi)

    return MakeResponse({
      datasetReviewId,
      form,
      locale,
      otherAuthors,
    })
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

export const UseOfAiSubmission = ({
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
    const locale = yield* Locale

    const form = UseOfAiForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: UseOfAiForm.CompletedForm) {
          yield* DatasetReviews.declareIfAiWasUsedToGenerateNewIdeas(
            form.generativeAiIdeas === 'yes'
              ? { answer: 'yes', detail: form.generativeAiIdeasDetails, datasetReviewId, userId: user.orcid }
              : { answer: 'no', datasetReviewId, userId: user.orcid },
          )

          const nextExpectedCommand = yield* Effect.flatten(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          )

          return Response.RedirectResponse({
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
      InvalidForm: Effect.fnUntraced(
        function* (form: UseOfAiForm.InvalidForm) {
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
