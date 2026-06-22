import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface GetNameEnv {
  getName: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', Name | undefined>
}

export const getName = (orcid: OrcidId) =>
  pipe(
    RTE.ask<GetNameEnv>(),
    RTE.chainTaskEitherK(({ getName }) => getName(orcid)),
  )
