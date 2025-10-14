import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { PreprintId } from '../Preprints/index.ts'
import type { RapidPrereview } from '../Prereviews/index.ts'

export interface GetRapidPrereviewsEnv {
  getRapidPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<RapidPrereview>>
}

export const getRapidPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetRapidPrereviewsEnv, 'unavailable', ReadonlyArray<RapidPrereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getRapidPrereviews }) => getRapidPrereviews(id)))
