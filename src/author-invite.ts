import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type EmailAddress, EmailAddressC } from './types/EmailAddress.js'
import { type Orcid, isOrcid } from './types/Orcid.js'

export type AuthorInvite = OpenAuthorInvite | DeclinedAuthorInvite | AssignedAuthorInvite | CompletedAuthorInvite

export interface OpenAuthorInvite {
  readonly status: 'open'
  readonly emailAddress: EmailAddress
  readonly review: number
}

export interface DeclinedAuthorInvite {
  readonly status: 'declined'
  readonly review: number
}

export interface AssignedAuthorInvite {
  readonly status: 'assigned'
  readonly emailAddress: EmailAddress
  readonly orcid: Orcid
  readonly persona?: 'public' | 'pseudonym'
  readonly review: number
}

export interface CompletedAuthorInvite {
  readonly status: 'completed'
  readonly orcid: Orcid
  readonly review: number
}

export interface CreateAuthorInviteEnv {
  createAuthorInvite: (authorInvite: OpenAuthorInvite) => TE.TaskEither<'unavailable', Uuid>
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
  emailAddress: EmailAddressC,
  review: C.number,
}) satisfies C.Codec<unknown, unknown, OpenAuthorInvite>

const DeclinedAuthorInviteC = C.struct({
  status: C.literal('declined'),
  review: C.number,
}) satisfies C.Codec<unknown, unknown, DeclinedAuthorInvite>

const AssignedAuthorInviteC = pipe(
  C.struct({
    status: C.literal('assigned'),
    emailAddress: EmailAddressC,
    orcid: OrcidC,
    review: C.number,
  }),
  C.intersect(
    C.partial({
      persona: C.literal('public', 'pseudonym'),
    }),
  ),
) satisfies C.Codec<unknown, unknown, AssignedAuthorInvite>

const CompletedAuthorInviteC = C.struct({
  status: C.literal('completed'),
  orcid: OrcidC,
  review: C.number,
}) satisfies C.Codec<unknown, unknown, CompletedAuthorInvite>

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const AuthorInviteC = C.make(
  D.union(OpenAuthorInviteC, DeclinedAuthorInviteC, AssignedAuthorInviteC, CompletedAuthorInviteC),
  {
    encode: authorInvite =>
      match(authorInvite)
        .with({ status: 'open' }, OpenAuthorInviteC.encode)
        .with({ status: 'declined' }, DeclinedAuthorInviteC.encode)
        .with({ status: 'assigned' }, AssignedAuthorInviteC.encode)
        .with({ status: 'completed' }, CompletedAuthorInviteC.encode)
        .exhaustive(),
  },
) satisfies C.Codec<unknown, unknown, AuthorInvite>

export const createAuthorInvite = (
  authorInvite: OpenAuthorInvite,
): RTE.ReaderTaskEither<CreateAuthorInviteEnv, 'unavailable', Uuid> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ createAuthorInvite }) => createAuthorInvite(authorInvite)))

export const getAuthorInvite = (
  id: Uuid,
): RTE.ReaderTaskEither<GetAuthorInviteEnv, 'not-found' | 'unavailable', AuthorInvite> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getAuthorInvite }) => getAuthorInvite(id)))

export const saveAuthorInvite = (
  id: Uuid,
  authorInvite: AuthorInvite,
): RTE.ReaderTaskEither<SaveAuthorInviteEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveAuthorInvite }) => saveAuthorInvite(id, authorInvite)))
