import * as RT from 'fp-ts/ReaderTask'
import { pipe } from 'fp-ts/function'
import {
  type CanRequestReviewsEnv,
  type CanSeeGatesLogoEnv,
  canRequestReviews,
  canSeeGatesLogo,
} from '../feature-flags.js'
import type { PageResponse } from '../response.js'
import type { User } from '../user.js'
import { createPage } from './home-page.js'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.js'
import { type GetRecentReviewRequestsEnv, getRecentReviewRequests } from './recent-review-requests.js'

export { RecentPrereview } from './recent-prereviews.js'
export { RecentReviewRequest } from './recent-review-requests.js'

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
    RT.let('statistics', () => ({ prereviews: 891, servers: 22, users: 2744 })),
    RT.map(createPage),
  )
