import type { Ord } from 'fp-ts/lib/Ord.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RS from 'fp-ts/lib/ReadonlySet.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC, ordNonEmptyString } from './types/string.js'

export interface OrcidToken {
  readonly accessToken: NonEmptyString
  readonly scopes: ReadonlySet<NonEmptyString>
}

export interface GetOrcidTokenEnv {
  getOrcidToken: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', OrcidToken>
}

export interface EditOrcidTokenEnv {
  saveOrcidToken: (orcid: Orcid, orcidToken: OrcidToken) => TE.TaskEither<'unavailable', void>
}

export interface DeleteOrcidTokenEnv {
  deleteOrcidToken: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
}

const ReadonlySetC = <O, A>(item: C.Codec<unknown, O, A>, ordItem: Ord<A>) =>
  pipe(C.array(item), C.readonly, C.imap(RS.fromReadonlyArray(ordItem), RS.toReadonlyArray(ordItem)))

export const OrcidTokenC = C.struct({
  accessToken: NonEmptyStringC,
  scopes: ReadonlySetC(NonEmptyStringC, ordNonEmptyString),
}) satisfies C.Codec<unknown, unknown, OrcidToken>

export const getOrcidToken = (orcid: Orcid) =>
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
  orcid: Orcid,
  orcidToken: OrcidToken,
): RTE.ReaderTaskEither<EditOrcidTokenEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveOrcidToken }) => saveOrcidToken(orcid, orcidToken)))

export const deleteOrcidToken = (orcid: Orcid) =>
  pipe(
    RTE.ask<DeleteOrcidTokenEnv>(),
    RTE.chainTaskEitherK(({ deleteOrcidToken }) => deleteOrcidToken(orcid)),
  )
