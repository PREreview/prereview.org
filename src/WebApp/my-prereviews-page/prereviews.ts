import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { RecentDatasetPrereview, RecentPreprintPrereview } from '../../Prereviews/index.ts'
import type { OrcidId } from '../../types/index.ts'
import { UnableToLoadPrereviews } from './unable-to-load-prereviews.ts'

export type Prereview = RecentPreprintPrereview | RecentDatasetPrereview

export interface GetMyPrereviewsEnv {
  getMyPrereviews: (user: OrcidId.OrcidId) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export const getMyPrereviews = (
  user: OrcidId.OrcidId,
): RTE.ReaderTaskEither<GetMyPrereviewsEnv, UnableToLoadPrereviews, ReadonlyArray<Prereview>> =>
  pipe(
    RTE.ask<GetMyPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getMyPrereviews }) => getMyPrereviews(user)),
    RTE.mapLeft(() => UnableToLoadPrereviews),
  )
