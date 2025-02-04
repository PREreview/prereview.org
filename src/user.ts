import { Context, Data, Effect, flow, pipe, Schema } from 'effect'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as O from 'fp-ts/lib/Option.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import type { StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { isOrcid } from 'orcid-id-ts'
import { Pseudonym } from './types/index.js'

export type User = C.TypeOf<typeof UserC>

export class LoggedInUser extends Context.Tag('User')<LoggedInUser, User>() {}

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

const OrcidSchema = pipe(Schema.String, Schema.filter(isOrcid))

export const UserC = C.struct({
  name: C.string,
  orcid: OrcidC,
  pseudonym: Pseudonym.PseudonymC,
})

export const UserSchema = Schema.Struct({
  name: Schema.String,
  orcid: OrcidSchema,
  pseudonym: Pseudonym.PseudonymSchema,
})

export const newSessionForUser: (user: User) => JsonRecord = flow(UserC.encode, user => RR.singleton('user', user))

export const getUserFromSession: (session: JsonRecord) => O.Option<User> = flow(
  RR.lookup('user'),
  O.chainEitherK(UserC.decode),
)

export const EnsureUserIsLoggedIn: Effect.Effect<User, UserIsNotLoggedIn> = Effect.mapError(
  Effect.serviceOptional(LoggedInUser),
  () => new UserIsNotLoggedIn(),
)

export class UserIsNotLoggedIn extends Data.TaggedError('UserIsNotLoggedIn') {}
