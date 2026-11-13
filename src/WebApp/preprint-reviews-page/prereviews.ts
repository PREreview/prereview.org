import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { PreprintId } from '../../Domain/Preprints/index.ts'
import type { PreprintPrereview } from '../../Domain/Prereviews/index.ts'

export interface GetPrereviewsEnv {
  getPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<PreprintPrereview>>
}

export const getPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<PreprintPrereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews(id)))
