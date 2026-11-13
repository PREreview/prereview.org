import { HttpServerResponse } from 'effect/http'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Effect, pipe, Schema } from 'effect'
import { Clubs } from '../../Domain/Clubs/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { Name } from '../../types/index.ts'
import { PlainDateSchema } from '../../types/Temporal.ts'
import { UuidSchema, type Uuid } from '../../types/Uuid.ts'

interface Club {
  id: Uuid
  name: Name.Name
  added: Temporal.PlainDate
  status: 'active' | 'inactive'
}

const getClubs: Effect.Effect<Array.NonEmptyReadonlyArray<Club>, never, Clubs> = Effect.gen(function* () {
  const clubs = yield* Clubs

  const clubsList = yield* pipe(
    clubs.listClubs,
    Effect.map(Array.map(({ id }) => clubs.getClubDetails(id))),
    Effect.andThen(effects => Effect.all(effects, { concurrency: 'unbounded' })),
  )

  return Array.map(clubsList, club => ({
    id: club.id,
    name: club.name.text,
    added: club.added,
    status: club.status,
  }))
}).pipe(Effect.catchTag('ClubNotFound', Effect.die))

const ClubSchema = Schema.Struct({
  id: UuidSchema,
  name: Name.NameSchema,
  added: PlainDateSchema,
  status: Schema.Literals(['active', 'inactive']),
})

const ClubsSchema = Schema.Array(ClubSchema)

export const ClubsData = pipe(
  getClubs,
  Effect.andThen(HttpServerResponse.schemaJson(ClubsSchema)),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to create clubs data list'), { error })),
  Effect.catchTags({
    HttpBodyError: () => Effect.succeed(HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable })),
  }),
  Effect.withSpan('ClubsData'),
)
