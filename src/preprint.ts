import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type * as Preprints from './Preprints/index.ts'

/** @deprecated */
export interface GetPreprintTitleEnv {
  getPreprintTitle: (
    id: Preprints.IndeterminatePreprintId,
  ) => TE.TaskEither<Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable, Preprints.PreprintTitle>
}

/** @deprecated */
export const getPreprintTitle = (
  id: Preprints.IndeterminatePreprintId,
): RTE.ReaderTaskEither<
  GetPreprintTitleEnv,
  Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Preprints.PreprintTitle
> => RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }) => getPreprintTitle(id)))
