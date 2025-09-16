import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { NonEmptyString } from '../types/NonEmptyString.js'
import type { Orcid } from '../types/Orcid.js'

export interface GetNameEnv {
  getName: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString | undefined>
}

export const getName = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetNameEnv>(),
    RTE.chainTaskEitherK(({ getName }) => getName(orcid)),
  )
