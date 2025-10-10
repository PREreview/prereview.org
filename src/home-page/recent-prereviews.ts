import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { RecentPrereview } from '../Prereviews/index.ts'

export interface GetRecentPrereviewsEnv {
  getRecentPrereviews: () => T.Task<ReadonlyArray<RecentPrereview>>
}

export const getRecentPrereviews = () =>
  pipe(
    RT.ask<GetRecentPrereviewsEnv>(),
    RT.chainTaskK(({ getRecentPrereviews }) => getRecentPrereviews()),
  )
