import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'

export type AuthorInvite = OpenAuthorInvite | AssignedAuthorInvite

export interface OpenAuthorInvite {
  readonly status: 'open'
  readonly review: number
}

export interface AssignedAuthorInvite {
  readonly status: 'assigned'
  readonly review: number
}

export interface GetAuthorInviteEnv {
  getAuthorInvite: (id: Uuid) => TE.TaskEither<'not-found' | 'unavailable', AuthorInvite>
}

export interface SaveAuthorInviteEnv {
  saveAuthorInvite: (id: Uuid, authorInvite: AuthorInvite) => TE.TaskEither<'unavailable', void>
}

const OpenAuthorInviteC = C.struct({
  status: C.literal('open'),
  review: C.number,
}) satisfies C.Codec<unknown, unknown, OpenAuthorInvite>

const AssignedAuthorInviteC = C.struct({
  status: C.literal('assigned'),
  review: C.number,
}) satisfies C.Codec<unknown, unknown, AssignedAuthorInvite>

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const AuthorInviteC = C.make(D.union(OpenAuthorInviteC, AssignedAuthorInviteC), {
  encode: authorInvite =>
    match(authorInvite)
      .with({ status: 'open' }, OpenAuthorInviteC.encode)
      .with({ status: 'assigned' }, AssignedAuthorInviteC.encode)
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
