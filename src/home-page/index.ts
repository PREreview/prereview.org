import * as RT from 'fp-ts/lib/ReaderTask.js'
import { pipe } from 'fp-ts/lib/function.js'
import {
  type CanRequestReviewsEnv,
  type CanSeeGatesLogoEnv,
  canRequestReviews,
  canSeeGatesLogo,
} from '../feature-flags.js'
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
    RT.let('statistics', () => ({ prereviews: 972, servers: 24, users: 2906 })),
    RT.let('locale', () => locale),
    RT.map(createPage),
  )
