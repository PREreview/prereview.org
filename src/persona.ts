import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type * as Personas from './Personas/index.ts'
import type { OrcidId } from './types/index.ts'

/** @deprecated */
export interface GetPublicPersonaEnv {
  getPublicPersona: (orcidId: OrcidId.OrcidId) => TE.TaskEither<Personas.UnableToGetPersona, Personas.PublicPersona>
}

/** @deprecated */
export interface GetPseudonymPersonaEnv {
  getPseudonymPersona: (
    orcidId: OrcidId.OrcidId,
  ) => TE.TaskEither<Personas.UnableToGetPersona, Personas.PseudonymPersona>
}

/** @deprecated */
export const getPublicPersona = (
  orcidId: OrcidId.OrcidId,
): RTE.ReaderTaskEither<GetPublicPersonaEnv, Personas.UnableToGetPersona, Personas.PublicPersona> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPublicPersona }) => getPublicPersona(orcidId)))

/** @deprecated */
export const getPseudonymPersona = (
  orcidId: OrcidId.OrcidId,
): RTE.ReaderTaskEither<GetPseudonymPersonaEnv, Personas.UnableToGetPersona, Personas.PseudonymPersona> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPseudonymPersona }) => getPseudonymPersona(orcidId)))
