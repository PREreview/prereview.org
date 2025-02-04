import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import type { User } from '../user.js'
import { createPage } from './home-page.js'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.js'
import { type GetRecentReviewRequestsEnv, getRecentReviewRequests } from './recent-review-requests.js'

export { type RecentPrereview } from './recent-prereviews.js'
export { type RecentReviewRequest } from './recent-review-requests.js'

export const home = ({
  locale,
  user,
}: {
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv & GetRecentPrereviewsEnv & GetRecentReviewRequestsEnv, PageResponse> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('canRequestReviews', RT.fromReader(canRequestReviews(user))),
    RT.apSW('recentReviewRequests', getRecentReviewRequests()),
    RT.let('statistics', () => ({ prereviews: 1100, servers: 27, users: 3155 })),
    RT.let('locale', () => locale),
    RT.map(createPage),
  )
