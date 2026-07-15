/* eslint-disable no-comments/disallowComments */
import { Context, Data, Effect, flow, Record, Schema } from 'effect'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as C from 'io-ts/lib/Codec.js'
import { OrcidId } from './types/index.ts'
import { OrcidC } from './types/OrcidId.ts'

export type User = C.TypeOf<typeof UserC>

export class LoggedInUser extends Context.Tag('User')<LoggedInUser, User>() {}

export class SessionId extends Context.Tag('SessionId')<SessionId, string>() {}

export const UserC = C.struct({
  orcid: OrcidC,
})

export const UserSchema = Schema.Struct({
  orcid: OrcidId.OrcidIdSchema,
})

export const newSessionForUser: (user: User) => JsonRecord = flow(UserC.encode, user => Record.singleton('user', user))

export const EnsureUserIsLoggedIn: Effect.Effect<User, UserIsNotLoggedIn> = Effect.mapError(
  Effect.serviceOptional(LoggedInUser),
  () => new UserIsNotLoggedIn(),
)

export class UserIsNotLoggedIn extends Data.TaggedError('UserIsNotLoggedIn') {}

export const PrereviewTeam = [
  OrcidId.OrcidId('0000-0001-8511-8689'), // Vanessa Fairhurst
  OrcidId.OrcidId('0000-0001-9008-3302'), // María Sol Ruiz
  OrcidId.OrcidId('0000-0002-1472-1824'), // Chad Sansing
  OrcidId.OrcidId('0000-0002-5753-2556'), // Daniel Haarhoff
  OrcidId.OrcidId('0000-0002-6109-0367'), // Daniela Saderi
  OrcidId.OrcidId('0000-0002-9143-1011'), // María Pía Tavella
  OrcidId.OrcidId('0000-0003-4921-6155'), // Chris Wilkinson
] as const

export const isPrereviewTeam = (user?: User) => (user ? PrereviewTeam.includes(user.orcid) : false)
