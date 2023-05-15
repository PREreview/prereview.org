import type { JsonRecord } from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, pipe } from 'fp-ts/function'
import type { StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'

export type User = C.TypeOf<typeof UserC>

export interface GetUserEnv {
  getUser: () => M.Middleware<StatusOpen, StatusOpen, 'no-session' | Error, User>
}

export const getUser = pipe(
  RM.ask<GetUserEnv>(),
  RM.chainMiddlewareK(({ getUser }) => getUser()),
)

export const maybeGetUser = pipe(
  getUser,
  RM.orElseW(() => RM.of(undefined)),
)

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

export const UserC = C.struct({
  name: C.string,
  orcid: OrcidC,
  pseudonym: C.string,
})

export const newSessionForUser: (user: User) => JsonRecord = flow(UserC.encode, user => RR.singleton('user', user))

export const getUserFromSession: (session: JsonRecord) => O.Option<User> = flow(
  RR.lookup('user'),
  O.chainEitherK(UserC.decode),
)
