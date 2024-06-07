import * as RT from 'fp-ts/ReaderTask'
import { pipe } from 'fp-ts/function'
import {
  type CanRequestReviewsEnv,
  type CanSeeGatesLogoEnv,
  canRequestReviews,
  canSeeGatesLogo,
} from '../feature-flags'
import type { PageResponse } from '../response'
import type { User } from '../user'
import { createPage } from './home-page'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { type GetRecentReviewRequestsEnv, getRecentReviewRequests } from './recent-review-requests'

export { RecentPrereview } from './recent-prereviews'
export { RecentReviewRequest } from './recent-review-requests'

export const home = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<
  CanRequestReviewsEnv & GetRecentPrereviewsEnv & GetRecentReviewRequestsEnv & CanSeeGatesLogoEnv,
  PageResponse
> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('canRequestReviews', RT.fromReader(canRequestReviews(user))),
    RT.apSW('canSeeGatesLogo', RT.fromReader(canSeeGatesLogo)),
    RT.apSW('recentReviewRequests', getRecentReviewRequests()),
    RT.map(createPage),
  )
