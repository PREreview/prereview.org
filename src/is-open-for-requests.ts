import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export type IsOpenForRequests =
  | {
      readonly value: false
    }
  | {
      readonly value: true
      readonly visibility: 'public' | 'restricted'
    }

export interface IsOpenForRequestsEnv {
  isOpenForRequests: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', IsOpenForRequests>
}

export interface EditOpenForRequestsEnv extends IsOpenForRequestsEnv {
  saveOpenForRequests: (orcid: Orcid, isOpenForRequests: IsOpenForRequests) => TE.TaskEither<'unavailable', void>
}

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const IsOpenForRequestsC = C.make(
  D.union(
    D.struct({
      value: D.literal(false),
    }),
    D.struct({
      value: D.literal(true),
      visibility: C.literal('public', 'restricted'),
    }),
  ),
  E.id(),
) satisfies C.Codec<unknown, unknown, IsOpenForRequests>

export const isOpenForRequests = (orcid: Orcid) =>
  pipe(
    RTE.ask<IsOpenForRequestsEnv>(),
    RTE.chainTaskEitherK(({ isOpenForRequests }) => isOpenForRequests(orcid)),
  )

export const maybeIsOpenForRequests = flow(
  isOpenForRequests,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveOpenForRequests = (
  orcid: Orcid,
  isOpenForRequests: IsOpenForRequests,
): RTE.ReaderTaskEither<EditOpenForRequestsEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveOpenForRequests }) => saveOpenForRequests(orcid, isOpenForRequests)),
  )
