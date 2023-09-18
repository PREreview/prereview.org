import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'

export interface IsOpenForRequests {
  readonly value: boolean
  readonly visibility: 'public' | 'restricted'
}

export interface IsOpenForRequestsEnv {
  isOpenForRequests: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', IsOpenForRequests>
}

export interface EditOpenForRequestsEnv extends IsOpenForRequestsEnv {
  saveOpenForRequests: (orcid: Orcid, isOpenForRequests: IsOpenForRequests) => TE.TaskEither<'unavailable', void>
}

export const IsOpenForRequestsC = C.struct({
  value: C.boolean,
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, IsOpenForRequests>

export const isOpenForRequests = (orcid: Orcid) =>
  pipe(
    RTE.ask<IsOpenForRequestsEnv>(),
    RTE.chainTaskEitherK(({ isOpenForRequests }) => isOpenForRequests(orcid)),
  )

export const saveOpenForRequests = (
  orcid: Orcid,
  isOpenForRequests: IsOpenForRequests,
): RTE.ReaderTaskEither<EditOpenForRequestsEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveOpenForRequests }) => saveOpenForRequests(orcid, isOpenForRequests)),
  )
