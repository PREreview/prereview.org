import type { Temporal } from '@js-temporal/polyfill'
import { Function, Schema, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as D from 'io-ts/lib/Decoder.js'
import { getClubAddedDate, getClubName } from '../club-details.js'
import type { ScietyListEnv } from '../sciety-list/index.js'
import { type ClubId, clubIds } from '../types/club-id.js'
import { PlainDateSchema } from '../types/Temporal.js'

interface Club {
  id: ClubId
  name: string
  added: Temporal.PlainDate
}

const getClubs = (): ReadonlyArray<Club> =>
  pipe(
    clubIds,
    RA.map(id => ({
      id,
      name: getClubName(id),
      added: getClubAddedDate(id),
    })),
  )

const ClubSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  added: PlainDateSchema,
})

const ClubsSchema = Schema.Array(ClubSchema)

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env => D.literal(`Bearer ${env.scietyListToken}`).decode(authorizationHeader)),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const clubsData = (authorizationHeader: string): RTE.ReaderTaskEither<ScietyListEnv, 'forbidden', string> =>
  pipe(authorizationHeader, isAllowed, RTE.map(getClubs), RTE.map(Schema.encodeSync(Schema.parseJson(ClubsSchema))))
