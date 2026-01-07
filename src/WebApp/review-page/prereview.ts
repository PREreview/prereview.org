import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { Prereview } from '../../Prereviews/index.ts'

export type { Prereview } from '../../Prereviews/index.ts'

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable' | 'not-found' | 'removed', Prereview>
}

export const getPrereview = (
  id: number,
): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found' | 'removed', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))
