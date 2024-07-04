import type { Json } from 'fp-ts/lib/Json.js'
import { constVoid, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import type * as E from 'io-ts/lib/Encoder.js'
import safeStableStringify from 'safe-stable-stringify'
import { match } from 'ts-pattern'
import type { ScietyListEnv } from '../sciety-list/index.js'

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, constVoid),
)

export const usersData = pipe(
  isAllowed,
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType('application/json')),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(() => RM.send(JsonE.encode([]))),
  RM.orElseW(error =>
    match(error)
      .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
      .exhaustive(),
  ),
)
