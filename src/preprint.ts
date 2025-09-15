import type { Array } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type * as Preprints from './Preprints/index.js'

/** @deprecated */
export interface ResolvePreprintIdEnv {
  resolvePreprintId: (
    ...ids: Array.NonEmptyReadonlyArray<Preprints.IndeterminatePreprintId>
  ) => TE.TaskEither<
    Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
    Preprints.PreprintId
  >
}

/** @deprecated */
export interface GetPreprintIdEnv {
  getPreprintId: (
    id: Preprints.IndeterminatePreprintId,
  ) => TE.TaskEither<Preprints.PreprintIsUnavailable, Preprints.PreprintId>
}

/** @deprecated */
export interface GetPreprintEnv {
  getPreprint: (
    id: Preprints.IndeterminatePreprintId,
  ) => TE.TaskEither<Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable, Preprints.Preprint>
}

/** @deprecated */
export interface GetPreprintTitleEnv {
  getPreprintTitle: (
    id: Preprints.IndeterminatePreprintId,
  ) => TE.TaskEither<Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable, Preprints.PreprintTitle>
}

/** @deprecated */
export const resolvePreprintId = (...ids: Array.NonEmptyReadonlyArray<Preprints.IndeterminatePreprintId>) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ resolvePreprintId }: ResolvePreprintIdEnv) => resolvePreprintId(...ids)),
  )

/** @deprecated */
export const getPreprintId = (id: Preprints.IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintId }: GetPreprintIdEnv) => getPreprintId(id)))

/** @deprecated */
export const getPreprint = (
  id: Preprints.IndeterminatePreprintId,
): RTE.ReaderTaskEither<
  GetPreprintEnv,
  Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Preprints.Preprint
> => RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }) => getPreprint(id)))

/** @deprecated */
export const getPreprintTitle = (
  id: Preprints.IndeterminatePreprintId,
): RTE.ReaderTaskEither<
  GetPreprintTitleEnv,
  Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Preprints.PreprintTitle
> => RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }) => getPreprintTitle(id)))
