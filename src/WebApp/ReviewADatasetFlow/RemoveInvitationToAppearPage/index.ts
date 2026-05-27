import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type { Uuid } from '../../../types/index.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type * as Response from '../../Response/index.ts'

export const RemoveInvitationToAppearPage = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invitationId,
}: {
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  HavingProblemsPage

export const RemoveInvitationToAppearSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invitationId,
}: {
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewCommands | Locale | LoggedInUser> =>
  HavingProblemsPage
