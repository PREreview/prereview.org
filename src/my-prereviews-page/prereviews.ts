import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { RecentPreprintPrereview } from '../Prereviews/index.ts'
import type { User } from '../user.ts'
import { UnableToLoadPrereviews } from './unable-to-load-prereviews.ts'

export type Prereview = RecentPreprintPrereview

export interface GetMyPrereviewsEnv {
  getMyPrereviews: (user: User) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export const getMyPrereviews = (
  user: User,
): RTE.ReaderTaskEither<GetMyPrereviewsEnv, UnableToLoadPrereviews, ReadonlyArray<Prereview>> =>
  pipe(
    RTE.ask<GetMyPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getMyPrereviews }) => getMyPrereviews(user)),
    RTE.mapLeft(() => UnableToLoadPrereviews),
  )
