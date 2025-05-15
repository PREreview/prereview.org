import { Function, flow, pipe } from 'effect'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import safeStableStringify from 'safe-stable-stringify'
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

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env => D.literal(`Bearer ${env.scietyListToken}`).decode(authorizationHeader)),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const clubsData = (authorizationHeader: string): RTE.ReaderTaskEither<ScietyListEnv, 'forbidden', string> =>
  pipe(
    authorizationHeader,
    isAllowed,
    RTE.map(getClubs),
    RTE.map(ClubsE.encode),
    RTE.map(clubs => JsonE.encode(clubs)),
  )
