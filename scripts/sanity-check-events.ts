/* eslint-disable import/no-internal-modules */
import { SqlClient, type SqlError } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { Console, Effect, Layer, ParseResult, Schema, pipe } from 'effect'
import path from 'path'
import { Event, type EventTypes } from '../src/Events.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'

const SensitiveDataStoreStub = Layer.succeed(SensitiveDataStore.SensitiveDataStore, {
  get: () => Effect.succeedNone,
  getMany: () => Effect.succeed({}),
  add: () => Effect.die('not implemented'),
})

const EventRow = Schema.transformOrFail(
  Schema.Struct({
    position: Schema.Number,
    type: Schema.String,
    payload: Schema.Union(
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
      Schema.parseJson(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    ),
  }),
  Schema.typeSchema(
    Schema.Struct({
      position: Schema.Number,
      event: Event,
    }),
  ),
  {
    strict: true,
    decode: ({ type, payload, ...rest }) =>
      Effect.gen(function* () {
        const event = yield* ParseResult.decodeUnknown(Event)({ _tag: type, ...payload })
        return { ...rest, event }
      }),
    encode: (value, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, value)),
  },
)

type EventType = (typeof EventTypes)[number]

interface Rule {
  pertinentEventFilter: {
    types: ReadonlyArray<EventType>
    matchingFields: ReadonlyArray<string>
  }
  permittedPrecedingEvents: ReadonlyArray<ReadonlyArray<EventType>>
}

const rules: Partial<Record<EventType, Rule>> = {
  ContactAddressImported: {
    pertinentEventFilter: {
      types: [
        'ContactAddressImported',
        'ContactAddressRecorded',
        'ContactAddressVerified',
        'EmailToVerifyContactAddressSent',
      ],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: [[]],
  },
  ContactAddressRecorded: {
    pertinentEventFilter: {
      types: [
        'ContactAddressImported',
        'ContactAddressRecorded',
        'ContactAddressVerified',
        'EmailToVerifyContactAddressSent',
      ],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: [[]],
  },
  ContactAddressVerified: {
    pertinentEventFilter: {
      types: ['ContactAddressImported', 'ContactAddressRecorded', 'ContactAddressVerified'],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: [['ContactAddressImported'], ['ContactAddressRecorded']],
  },
  EmailToVerifyContactAddressSent: {
    pertinentEventFilter: {
      types: ['ContactAddressImported', 'ContactAddressRecorded'],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: [['ContactAddressImported'], ['ContactAddressRecorded']],
  },
  AuthorInviteEmailAddressChosenAsContactAddress: {
    pertinentEventFilter: {
      types: ['AuthorInviteEmailAddressChosenAsContactAddress'],
      matchingFields: ['inviteId'],
    },
    permittedPrecedingEvents: [[]],
  },
  EmailToInviteAuthorSent: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted'],
      matchingFields: ['invitationId'],
    },
    permittedPrecedingEvents: [[]],
  },
  AuthorInviteAccepted: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted'],
      matchingFields: ['invitationId'],
    },
    permittedPrecedingEvents: [[]],
  },
  PersonaForAReviewChosen: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted', 'AuthorChoicesForAReviewConfirmed'],
      matchingFields: ['reviewId', 'orcidId'],
    },
    permittedPrecedingEvents: [['AuthorInviteAccepted']],
  },
  AuthorChoicesForAReviewConfirmed: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted', 'AuthorChoicesForAReviewConfirmed'],
      matchingFields: ['reviewId', 'orcidId'],
    },
    permittedPrecedingEvents: [['AuthorInviteAccepted']],
  },
}

const getPertinentPrecedingEvents = (
  row: typeof EventRow.Type,
  filter: Rule['pertinentEventFilter'],
): Effect.Effect<ReadonlyArray<EventType>, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const event = row.event as unknown as Record<string, unknown>
    const matchingEntries: Array<[string, string]> = []
    for (const field of filter.matchingFields) {
      const value = event[field]
      if (typeof value !== 'string') return []
      matchingEntries.push([field, value])
    }
    const results = yield* sql`
      SELECT
        type
      FROM
        events
      WHERE
        position < ${row.position}
        AND ${sql.in('type', filter.types)}
        AND ${sql.and(matchingEntries.map(([field, value]) => sql`payload ->> ${field} = ${value}`))}
      ORDER BY
        position ASC
    `
    return results.map((r: Record<string, unknown>) => r['type'] as EventType)
  })

const sanityCheck = (row: typeof EventRow.Type): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const rule = rules[row.event._tag]
    if (!rule) {
      return
    }
    const pertinentPrecedingEvents = yield* getPertinentPrecedingEvents(row, rule.pertinentEventFilter)
    const isPermitted = rule.permittedPrecedingEvents.some(
      seq =>
        seq.length === pertinentPrecedingEvents.length && seq.every((type, i) => type === pertinentPrecedingEvents[i]),
    )
    if (!isPermitted) {
      console.log(
        row.position,
        row.event._tag,
        'should be preceded by one of',
        rule.permittedPrecedingEvents,
        'is preceded by',
        pertinentPrecedingEvents,
      )
    }
  })

const program = pipe(
  SqlClient.SqlClient,
  Effect.andThen(
    sql => sql`
      SELECT
        type,
        payload,
        position
      FROM
        events
      ORDER BY
        position ASC
    `,
  ),
  Effect.andThen(Schema.decodeUnknown(Schema.Array(EventRow))),
  Effect.tap(rows => Console.log(`Loaded ${rows.length} events`)),
  Effect.andThen(rows => Effect.forEach(rows, sanityCheck, { discard: true })),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layer({ url: `file:${path.resolve(import.meta.dirname, '..', 'data', 'events.db')}` }),
      SensitiveDataStoreStub,
    ),
  ),
)

void Effect.runPromise(program)
