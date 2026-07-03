/* eslint-disable import/no-internal-modules */
import { SqlClient, type SqlError } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { Console, Data, Effect, Layer, Match, ParseResult, Schema, pipe } from 'effect'
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

class NoPrecedingEvents extends Data.TaggedClass('NoPrecedingEvents') {}

class FullSequence extends Data.TaggedClass('FullSequence')<{
  readonly sequences: ReadonlyArray<ReadonlyArray<EventType>>
}> {}

class LastPrecedingEvent extends Data.TaggedClass('LastPrecedingEvent')<{
  readonly types: ReadonlyArray<EventType>
}> {}

type PermittedPrecedingEvents = NoPrecedingEvents | FullSequence | LastPrecedingEvent

interface Rule {
  pertinentEventFilter: {
    types: ReadonlyArray<EventType>
    matchingFields: ReadonlyArray<string>
  }
  permittedPrecedingEvents: PermittedPrecedingEvents
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
    permittedPrecedingEvents: new NoPrecedingEvents(),
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
    permittedPrecedingEvents: new NoPrecedingEvents(),
  },
  ContactAddressVerified: {
    pertinentEventFilter: {
      types: ['ContactAddressImported', 'ContactAddressRecorded', 'ContactAddressVerified'],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: new LastPrecedingEvent({ types: ['ContactAddressImported', 'ContactAddressRecorded'] }),
  },
  EmailToVerifyContactAddressSent: {
    pertinentEventFilter: {
      types: ['ContactAddressImported', 'ContactAddressRecorded'],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: new LastPrecedingEvent({ types: ['ContactAddressImported', 'ContactAddressRecorded'] }),
  },
  AuthorInviteEmailAddressChosenAsContactAddress: {
    pertinentEventFilter: {
      types: ['AuthorInviteEmailAddressChosenAsContactAddress'],
      matchingFields: ['inviteId'],
    },
    permittedPrecedingEvents: new NoPrecedingEvents(),
  },
  EmailToInviteAuthorSent: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted'],
      matchingFields: ['invitationId'],
    },
    permittedPrecedingEvents: new NoPrecedingEvents(),
  },
  AuthorInviteAccepted: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted'],
      matchingFields: ['invitationId'],
    },
    permittedPrecedingEvents: new NoPrecedingEvents(),
  },
  PersonaForAReviewChosen: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'],
      matchingFields: ['reviewId', 'orcidId'],
    },
    permittedPrecedingEvents: new LastPrecedingEvent({ types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen'] }),
  },
  AuthorChoicesForAReviewConfirmed: {
    pertinentEventFilter: {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'],
      matchingFields: ['reviewId', 'orcidId'],
    },
    permittedPrecedingEvents: new LastPrecedingEvent({ types: ['PersonaForAReviewChosen'] }),
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
    const isPermitted = Match.valueTags(rule.permittedPrecedingEvents, {
      NoPrecedingEvents: () => pertinentPrecedingEvents.length === 0,
      FullSequence: ({ sequences }) =>
        sequences.some(
          seq =>
            seq.length === pertinentPrecedingEvents.length &&
            seq.every((type, i) => type === pertinentPrecedingEvents[i]),
        ),
      LastPrecedingEvent: ({ types }) => {
        const last = pertinentPrecedingEvents.at(-1)
        return last !== undefined && types.includes(last)
      },
    })
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
