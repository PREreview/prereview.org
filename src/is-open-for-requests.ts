import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'

export interface IsOpenForRequestsEnv {
  isOpenForRequests: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', boolean>
}

export const isOpenForRequests = (orcid: Orcid) =>
  pipe(
    RTE.ask<IsOpenForRequestsEnv>(),
    RTE.chainTaskEitherK(({ isOpenForRequests }) => isOpenForRequests(orcid)),
  )
