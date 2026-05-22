import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type { Uuid } from '../../../types/index.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type * as Response from '../../Response/index.ts'

export const AddInvitationToAppearPage = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  HavingProblemsPage

export const AddInvitationToAppearSubmission = ({
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
