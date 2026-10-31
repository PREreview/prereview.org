import { Result, flow, Function, pipe, Schema } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { CareerStage, Location } from '../../Prereviewers/index.ts'
import { NonEmptyString, OrcidId, Temporal } from '../../types/index.ts'
import type { ScietyListEnv } from '../sciety-list/index.ts'
import { EffectToFpts } from '../../RefactoringUtilities/index.ts'

export interface User {
  orcid: OrcidId.OrcidId
  timestamp: Temporal.Instant | 'not available from import source'
  requestNotifications: 'not-opted-in' | 'opted-in' | 'opted-out'
  orcidRecordConnected: boolean
  careerStage?: CareerStage['value'] | undefined
  location?: Location['value'] | undefined
}

export interface GetUsersEnv {
  getUsers: () => TE.TaskEither<'unavailable', ReadonlyArray<User>>
}

const getUsers = (): RTE.ReaderTaskEither<GetUsersEnv, 'unavailable', ReadonlyArray<User>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getUsers }) => getUsers()))

const UserSchema = Schema.Struct({
  orcid: OrcidId.OrcidIdSchema,
  timestamp: Schema.Union([Temporal.InstantSchema, Schema.Literal('not available from import source')]),
  requestNotifications: Schema.Literals(['not-opted-in', 'opted-in', 'opted-out']),
  orcidRecordConnected: Schema.Boolean,
  careerStage: Schema.optional(Schema.Literals(['early', 'mid', 'late'])),
  location: Schema.optional(NonEmptyString.NonEmptyStringSchema),
})

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env =>
      EffectToFpts.either(
        Schema.decodeUnknownResult(Schema.TemplateLiteralParser(['Bearer ', env.scietyListToken]))(authorizationHeader),
      ),
    ),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const usersData = (
  authorizationHeader: string,
): RTE.ReaderTaskEither<ScietyListEnv & GetUsersEnv, 'forbidden' | 'unavailable', string> =>
  pipe(
    authorizationHeader,
    isAllowed,
    RTE.chainW(getUsers),
    RTE.chainEitherKW(
      flow(
        Schema.encodeResult(Schema.fromJsonString(Schema.Array(UserSchema))),
        Result.mapError(() => 'unavailable' as const),
        EffectToFpts.either,
      ),
    ),
  )
