import { Context, Data, Effect, flow, Option, Record, Schema } from 'effect'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as FptsToEffect from './FptsToEffect.ts'
import { NonEmptyString, OrcidId, Pseudonym } from './types/index.ts'
import { isOrcidId } from './types/OrcidId.ts'

export type User = C.TypeOf<typeof UserC>

export class LoggedInUser extends Context.Tag('User')<LoggedInUser, User>() {}

export class SessionId extends Context.Tag('SessionId')<SessionId, string>() {}

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcidId, 'ORCID'))

export const UserC = C.struct({
  name: NonEmptyString.NonEmptyStringC,
  orcid: OrcidC,
  pseudonym: Pseudonym.PseudonymC,
})

export const UserSchema = Schema.Struct({
  name: NonEmptyString.NonEmptyStringSchema,
  orcid: OrcidId.OrcidIdSchema,
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
