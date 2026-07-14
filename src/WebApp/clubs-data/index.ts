import { HttpServerResponse } from '@effect/platform'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Effect, pipe, Schema } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { Name } from '../../types/index.ts'
import { PlainDateSchema } from '../../types/Temporal.ts'
import { UuidSchema, type Uuid } from '../../types/Uuid.ts'

interface Club {
  id: Uuid
  name: Name.Name
  added: Temporal.PlainDate
}

const getClubs: Effect.Effect<Array.NonEmptyReadonlyArray<Club>, never, Clubs> = Effect.gen(function* () {
  const clubs = yield* Clubs

  const clubsList = yield* pipe(
    clubs.listClubs,
    Effect.andThen(Array.map(({ id }) => clubs.getClubDetails(id))),
    Effect.andThen(Effect.allWith({ concurrency: 'inherit' })),
  )

  return Array.map(clubsList, club => ({
    id: club.id,
    name: club.name.text,
    added: club.added,
  }))
}).pipe(Effect.catchTag('ClubNotFound', Effect.die))

const ClubSchema = Schema.Struct({
  id: UuidSchema,
  name: Name.NameSchema,
  added: PlainDateSchema,
})

const ClubsSchema = Schema.Array(ClubSchema)

export const ClubsData = pipe(
  getClubs,
  Effect.andThen(HttpServerResponse.schemaJson(ClubsSchema)),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to create clubs data list'), { error })),
  Effect.catchTags({
    HttpBodyError: () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
  }),
)
