import { HttpServerResponse } from '@effect/platform'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Effect, pipe, Schema } from 'effect'
import { type ClubId, ClubIdSchema, getClubAddedDate, getClubName } from '../../Clubs/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { Name } from '../../types/index.ts'
import { PlainDateSchema } from '../../types/Temporal.ts'

interface Club {
  id: ClubId
  name: Name.Name
  added: Temporal.PlainDate
}

const getClubs = (): ReadonlyArray<Club> =>
  pipe(
    ClubIdSchema.literals,
    Array.map(id => ({
      id,
      name: getClubName(id).text,
      added: getClubAddedDate(id),
    })),
  )

const ClubSchema = Schema.Struct({
  id: ClubIdSchema,
  name: Name.NameSchema,
  added: PlainDateSchema,
})

const ClubsSchema = Schema.Array(ClubSchema)

export const ClubsData = pipe(
  getClubs(),
  HttpServerResponse.schemaJson(ClubsSchema),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to create clubs data list'), { error })),
  Effect.catchTags({
    HttpBodyError: () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
  }),
)
