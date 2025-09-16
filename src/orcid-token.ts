import { flow, HashSet, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'
import type { OrcidId } from './types/OrcidId.js'

export interface OrcidToken {
  readonly accessToken: NonEmptyString
  readonly scopes: HashSet.HashSet<NonEmptyString>
}

export interface GetOrcidTokenEnv {
  getOrcidToken: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', OrcidToken>
}

export interface EditOrcidTokenEnv {
  saveOrcidToken: (orcid: OrcidId, orcidToken: OrcidToken) => TE.TaskEither<'unavailable', void>
}

export interface DeleteOrcidTokenEnv {
  deleteOrcidToken: (orcid: OrcidId) => TE.TaskEither<'unavailable', void>
}

const HashSetC = <O, A>(item: C.Codec<unknown, O, A>) =>
  pipe(C.array(item), C.imap(HashSet.fromIterable, HashSet.toValues))

export const OrcidTokenC = C.struct({
  accessToken: NonEmptyStringC,
  scopes: HashSetC(NonEmptyStringC),
}) satisfies C.Codec<unknown, unknown, OrcidToken>

export const getOrcidToken = (orcid: OrcidId) =>
  pipe(
    RTE.ask<GetOrcidTokenEnv>(),
    RTE.chainTaskEitherK(({ getOrcidToken }) => getOrcidToken(orcid)),
  )

export const maybeGetOrcidToken = flow(
  getOrcidToken,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveOrcidToken = (
  orcid: OrcidId,
  orcidToken: OrcidToken,
): RTE.ReaderTaskEither<EditOrcidTokenEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveOrcidToken }) => saveOrcidToken(orcid, orcidToken)))

export const deleteOrcidToken = (orcid: OrcidId) =>
  pipe(
    RTE.ask<DeleteOrcidTokenEnv>(),
    RTE.chainTaskEitherK(({ deleteOrcidToken }) => deleteOrcidToken(orcid)),
  )
