import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { Locale } from '../../Context.js'
import type * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import type { LoggedInUser } from '../../user.js'

export const IsAppropriateForThisKindOfResearchQuestion = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  HavingProblemsPage

export const IsAppropriateForThisKindOfResearchSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> => HavingProblemsPage
