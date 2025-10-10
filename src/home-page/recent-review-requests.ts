import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { ReviewRequest } from '../ReviewRequests/index.ts'

export interface GetRecentReviewRequestsEnv {
  getRecentReviewRequests: () => T.Task<ReadonlyArray<ReviewRequest>>
}

export const getRecentReviewRequests = () =>
  pipe(
    RT.ask<GetRecentReviewRequestsEnv>(),
    RT.chainTaskK(({ getRecentReviewRequests }) => getRecentReviewRequests()),
  )
