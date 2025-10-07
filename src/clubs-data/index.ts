import type { Temporal } from '@js-temporal/polyfill'
import { Array, Function, Schema, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { type ClubId, clubIds, getClubAddedDate, getClubName } from '../Clubs/index.ts'
import type { ScietyListEnv } from '../sciety-list/index.ts'
import { PlainDateSchema } from '../types/Temporal.ts'

interface Club {
  id: ClubId
  name: string
  added: Temporal.PlainDate
}

const getClubs = (): ReadonlyArray<Club> =>
  pipe(
    clubIds,
    Array.map(id => ({
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
    RTE.chainEitherK(env =>
      Schema.decodeUnknownEither(Schema.TemplateLiteralParser('Bearer ', env.scietyListToken))(authorizationHeader),
    ),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const clubsData = (authorizationHeader: string): RTE.ReaderTaskEither<ScietyListEnv, 'forbidden', string> =>
  pipe(authorizationHeader, isAllowed, RTE.map(getClubs), RTE.map(Schema.encodeSync(Schema.parseJson(ClubsSchema))))
