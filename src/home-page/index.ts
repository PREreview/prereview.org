import * as RT from 'fp-ts/ReaderTask'
import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import {
  type CanRequestReviewsEnv,
  type CanSeeReviewRequestsEnv,
  canRequestReviews,
  canSeeReviewRequests,
} from '../feature-flags'
import type { PageResponse } from '../response'
import type { User } from '../user'
import { createPage } from './home-page'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { hardcodedRecentReviewRequests } from './recent-review-requests'

export { RecentPrereview } from './recent-prereviews'

export const home = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv & CanSeeReviewRequestsEnv & GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('canRequestReviews', user ? RT.fromReader(canRequestReviews(user)) : RT.of(false)),
    RT.apSW(
      'recentReviewRequests',
      pipe(
        user ? RT.fromReader(canSeeReviewRequests(user)) : RT.of(false),
        RT.map(
          b.matchW(
            () => [],
            () => hardcodedRecentReviewRequests,
          ),
        ),
      ),
    ),
    RT.map(createPage),
  )
