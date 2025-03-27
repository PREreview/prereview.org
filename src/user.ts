import { Context, Data, Effect, flow, Option, pipe, Record, Schema } from 'effect'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import type { StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { isOrcid } from 'orcid-id-ts'
import * as FptsToEffect from './FptsToEffect.js'
import { Pseudonym } from './types/index.js'
import * as Orcid from './types/Orcid.js'

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

export const UserC = C.struct({
  name: C.string,
  orcid: OrcidC,
  pseudonym: Pseudonym.PseudonymC,
})

export const UserSchema = Schema.Struct({
  name: Schema.String,
  orcid: Orcid.OrcidSchema,
  pseudonym: Pseudonym.PseudonymSchema,
})

export const newSessionForUser: (user: User) => JsonRecord = flow(UserC.encode, user => Record.singleton('user', user))

export const getUserFromSession: (session: JsonRecord) => Option.Option<User> = flow(
  Record.get<string>('user'),
  Option.flatMap(flow(FptsToEffect.eitherK(UserC.decode), Option.getRight)),
)

export const EnsureUserIsLoggedIn: Effect.Effect<User, UserIsNotLoggedIn> = Effect.mapError(
  Effect.serviceOptional(LoggedInUser),
  () => new UserIsNotLoggedIn(),
)

export class UserIsNotLoggedIn extends Data.TaggedError('UserIsNotLoggedIn') {}

export const isPrereviewTeam = (user?: User) =>
  user
    ? [
        '0000-0001-8511-8689',
        '0000-0002-1472-1824',
        '0000-0002-3708-3546',
        '0000-0002-5753-2556',
        '0000-0002-6109-0367',
        '0000-0002-6750-9341',
        '0000-0003-4921-6155',
        '0009-0009-4958-0871',
      ].includes(user.orcid)
    : false
