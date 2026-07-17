/* eslint-disable import/no-internal-modules */
import { SqlClient } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { Array, Console, Data, Effect, Layer, Match, Option, ParseResult, Schema, pipe } from 'effect'
import type { NonEmptyReadonlyArray } from 'effect/Array'
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

const allRules: Partial<Record<EventType, Rule | NonEmptyReadonlyArray<Rule>>> = {
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
      types: [
        'ContactAddressImported',
        'ContactAddressRecorded',
        'EmailToVerifyContactAddressSent',
        'ContactAddressVerified',
      ],
      matchingFields: ['contactAddressId'],
    },
    permittedPrecedingEvents: new LastPrecedingEvent({
      types: ['ContactAddressImported', 'ContactAddressRecorded', 'EmailToVerifyContactAddressSent'],
    }),
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
  event: Event,
  rows: ReadonlyArray<typeof EventRow.Type>,
  filter: Rule['pertinentEventFilter'],
): ReadonlyArray<EventType> => {
  const matchingEntries: Array<[string, string]> = []
  for (const field of filter.matchingFields) {
    const value = event[field as never]
    if (typeof value !== 'string') {
      throw new Error(`Field ${field} is not a string on event ${event._tag}`)
    }
    matchingEntries.push([field, value])
  }

  return Array.filterMap(rows, row => {
    return filter.types.includes(row.event._tag) &&
      matchingEntries.every(([field, value]) => row.event[field as never] === value)
      ? Option.some(row.event._tag)
      : Option.none()
  })
}

const sanityCheck = (rows: ReadonlyArray<typeof EventRow.Type>): void => {
  if (!Array.isNonEmptyReadonlyArray(rows)) {
    return
  }

  const row = Array.lastNonEmpty(rows)
  const previousRows = Array.initNonEmpty(rows)

  const rulesForType = allRules[row.event._tag]
  if (!rulesForType) {
    return
  }
  const rules = Array.ensure(rulesForType)
  rules.forEach(rule => {
    const pertinentPrecedingEvents = getPertinentPrecedingEvents(row.event, previousRows, rule.pertinentEventFilter)
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
}

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
  Effect.andThen(rows => Array.forEach(rows, (row, i) => sanityCheck(Array.take(rows, i + 1)))),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layer({ url: `file:${path.resolve(import.meta.dirname, '..', 'data', 'events.db')}` }),
      SensitiveDataStoreStub,
    ),
  ),
)

void Effect.runPromise(program)
