import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as C from 'io-ts/Codec'
import type { Uuid } from 'uuid-ts'

export interface AuthorInvite {
  readonly review: number
}

export interface GetAuthorInviteEnv {
  getAuthorInvite: (id: Uuid) => TE.TaskEither<'not-found' | 'unavailable', AuthorInvite>
}

export const AuthorInviteC = C.struct({
  review: C.number,
}) satisfies C.Codec<unknown, unknown, AuthorInvite>

export const getAuthorInvite = (
  id: Uuid,
): RTE.ReaderTaskEither<GetAuthorInviteEnv, 'not-found' | 'unavailable', AuthorInvite> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getAuthorInvite }) => getAuthorInvite(id)))
