import { Function, flow, pipe } from 'effect'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import safeStableStringify from 'safe-stable-stringify'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import type { ScietyListEnv } from '../sciety-list/index.js'
import { type ClubId, clubIds } from '../types/club-id.js'

interface Club {
  id: ClubId
  name: string
}

const getClubs = (): ReadonlyArray<Club> =>
  pipe(
    clubIds,
    RA.map(id => ({
      id,
      name: getClubName(id),
    })),
  )

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const ReadonlyArrayE = flow(E.array, E.readonly)

const ClubE = pipe(
  E.struct({
    id: StringE,
    name: StringE,
  }),
) satisfies E.Encoder<unknown, Club>

const ClubsE = ReadonlyArrayE(ClubE)

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, Function.constVoid),
)

export const clubsData = pipe(
  isAllowed,
  RM.map(getClubs),
  RM.map(ClubsE.encode),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType('application/json')),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(clubs => RM.send(JsonE.encode(clubs))),
  RM.orElseW(error =>
    match(error)
      .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
      .exhaustive(),
  ),
)
