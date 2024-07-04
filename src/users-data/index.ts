import type { Temporal } from '@js-temporal/polyfill'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { constVoid, flow, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import type { Orcid } from 'orcid-id-ts'
import safeStableStringify from 'safe-stable-stringify'
import { match } from 'ts-pattern'
import type { ScietyListEnv } from '../sciety-list/index.js'

export interface User {
  orcid: Orcid
  timestamp: Temporal.Instant
}

export interface GetUsersEnv {
  getUsers: () => TE.TaskEither<'unavailable', ReadonlyArray<User>>
}

const getUsers = (): RTE.ReaderTaskEither<GetUsersEnv, 'unavailable', ReadonlyArray<User>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getUsers }) => getUsers()))

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const OrcidE: E.Encoder<string, Orcid> = StringE

const InstantE: E.Encoder<string, Temporal.Instant> = StringE

const ReadonlyArrayE = flow(E.array, E.readonly)

const UserE = E.struct({
  orcid: OrcidE,
  timestamp: InstantE,
})

const UsersE = ReadonlyArrayE(UserE)

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, constVoid),
)

export const usersData = pipe(
  isAllowed,
  RM.chainReaderTaskEitherKW(getUsers),
  RM.map(UsersE.encode),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType('application/json')),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(users => RM.send(JsonE.encode(users))),
  RM.orElseW(error =>
    match(error)
      .with('unavailable', () =>
        pipe(RM.status(Status.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
      )
      .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
      .exhaustive(),
  ),
)
