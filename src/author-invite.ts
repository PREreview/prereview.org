import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { type Orcid, isOrcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'

export type AuthorInvite = OpenAuthorInvite | AssignedAuthorInvite | CompletedAuthorInvite

export interface OpenAuthorInvite {
  readonly status: 'open'
  readonly review: number
}

export interface AssignedAuthorInvite {
  readonly status: 'assigned'
  readonly orcid: Orcid
  readonly review: number
}

export interface CompletedAuthorInvite {
  readonly status: 'completed'
  readonly orcid: Orcid
  readonly review: number
}

export interface GetAuthorInviteEnv {
  getAuthorInvite: (id: Uuid) => TE.TaskEither<'not-found' | 'unavailable', AuthorInvite>
}

export interface SaveAuthorInviteEnv {
  saveAuthorInvite: (id: Uuid, authorInvite: AuthorInvite) => TE.TaskEither<'unavailable', void>
}

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

const OpenAuthorInviteC = C.struct({
  status: C.literal('open'),
  review: C.number,
}) satisfies C.Codec<unknown, unknown, OpenAuthorInvite>

const AssignedAuthorInviteC = C.struct({
  status: C.literal('assigned'),
  orcid: OrcidC,
  review: C.number,
}) satisfies C.Codec<unknown, unknown, AssignedAuthorInvite>

const CompletedAuthorInviteC = C.struct({
  status: C.literal('completed'),
  orcid: OrcidC,
  review: C.number,
}) satisfies C.Codec<unknown, unknown, CompletedAuthorInvite>

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const AuthorInviteC = C.make(D.union(OpenAuthorInviteC, AssignedAuthorInviteC, CompletedAuthorInviteC), {
  encode: authorInvite =>
    match(authorInvite)
      .with({ status: 'open' }, OpenAuthorInviteC.encode)
      .with({ status: 'assigned' }, AssignedAuthorInviteC.encode)
      .with({ status: 'completed' }, CompletedAuthorInviteC.encode)
      .exhaustive(),
}) satisfies C.Codec<unknown, unknown, AuthorInvite>

export const getAuthorInvite = (
  id: Uuid,
): RTE.ReaderTaskEither<GetAuthorInviteEnv, 'not-found' | 'unavailable', AuthorInvite> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getAuthorInvite }) => getAuthorInvite(id)))

export const saveAuthorInvite = (
  id: Uuid,
  authorInvite: AuthorInvite,
): RTE.ReaderTaskEither<SaveAuthorInviteEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveAuthorInvite }) => saveAuthorInvite(id, authorInvite)))
