import { Either, flow, Function, pipe, Schema } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { CareerStage } from '../career-stage.ts'
import type { Location } from '../location.ts'
import type { ScietyListEnv } from '../sciety-list/index.ts'
import { NonEmptyString, OrcidId, Temporal } from '../types/index.ts'

export interface User {
  orcid: OrcidId.OrcidId
  timestamp: Temporal.Instant
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
  timestamp: Temporal.InstantSchema,
  careerStage: Schema.optional(Schema.Literal('early', 'mid', 'late')),
  location: Schema.optional(NonEmptyString.NonEmptyStringSchema),
})

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env =>
      Schema.decodeUnknownEither(Schema.TemplateLiteralParser('Bearer ', env.scietyListToken))(authorizationHeader),
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
        Schema.encodeEither(Schema.parseJson(Schema.Array(UserSchema))),
        Either.mapLeft(() => 'unavailable' as const),
      ),
    ),
  )
