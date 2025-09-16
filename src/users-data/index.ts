import type { Temporal } from '@js-temporal/polyfill'
import { flow, Function, pipe } from 'effect'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import safeStableStringify from 'safe-stable-stringify'
import type { CareerStage } from '../career-stage.js'
import type { Location } from '../location.js'
import type { ScietyListEnv } from '../sciety-list/index.js'
import type { OrcidId } from '../types/OrcidId.js'

export interface User {
  orcid: OrcidId
  timestamp: Temporal.Instant
  careerStage?: CareerStage['value'] | undefined
  location?: Location['value'] | undefined
}

export interface GetUsersEnv {
  getUsers: () => TE.TaskEither<'unavailable', ReadonlyArray<User>>
}

const getUsers = (): RTE.ReaderTaskEither<GetUsersEnv, 'unavailable', ReadonlyArray<User>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getUsers }) => getUsers()))

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const OrcidE: E.Encoder<string, OrcidId> = StringE

const InstantE: E.Encoder<string, Temporal.Instant> = StringE

const ReadonlyArrayE = flow(E.array, E.readonly)

const UserE = pipe(
  E.struct({
    orcid: OrcidE,
    timestamp: InstantE,
  }),
  E.intersect(E.partial({ careerStage: E.id<CareerStage['value']>(), location: E.id<Location['value']>() })),
)

const UsersE = ReadonlyArrayE(UserE)

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env => D.literal(`Bearer ${env.scietyListToken}`).decode(authorizationHeader)),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const usersData = (
  authorizationHeader: string,
): RTE.ReaderTaskEither<ScietyListEnv & GetUsersEnv, 'forbidden' | 'unavailable', string> =>
  pipe(authorizationHeader, isAllowed, RTE.chainW(getUsers), RTE.map(UsersE.encode), RTE.map(JsonE.encode))
