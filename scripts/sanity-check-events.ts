/* eslint-disable import/no-internal-modules */
import { SqlClient } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import {
  Array,
  Console,
  Data,
  Effect,
  Either,
  Inspectable,
  Layer,
  Match,
  Option,
  ParseResult,
  Schema,
  pipe,
} from 'effect'
import type { NonEmptyReadonlyArray } from 'effect/Array'
import path from 'path'
import { ContactAddressImported, Event, type EventTypes } from '../src/Events.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Uuid } from '../src/types/Uuid.ts'

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

interface Example {
  name?: string
  expectation: 'pass' | 'fail'
  sequence: NonEmptyReadonlyArray<Event>
}

const examples: ReadonlyArray<Example> = [
  {
    expectation: 'pass',
    sequence: [
      new ContactAddressImported({
        contactAddressId: Uuid('0881ba38-af64-4ab9-920d-f7593c6abfb7'),
        emailAddress: Option.none(),
        orcidId: OrcidId('0000-0002-1825-0097'),
        verificationStatus: 'verified',
      }),
    ],
  },
  {
    expectation: 'fail',
    sequence: [
      new ContactAddressImported({
        contactAddressId: Uuid('0881ba38-af64-4ab9-920d-f7593c6abfb7'),
        emailAddress: Option.none(),
        orcidId: OrcidId('0000-0002-1825-0097'),
        verificationStatus: 'verified',
      }),
      new ContactAddressImported({
        contactAddressId: Uuid('0881ba38-af64-4ab9-920d-f7593c6abfb7'),
        emailAddress: Option.none(),
        orcidId: OrcidId('0000-0002-1825-0097'),
        verificationStatus: 'verified',
      }),
    ],
  },
]

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

const sanityCheck = (
  rows: ReadonlyArray<typeof EventRow.Type>,
): Either.Either<void, Array.NonEmptyReadonlyArray<string>> => {
  if (!Array.isNonEmptyReadonlyArray(rows)) {
    return Either.void
  }

  const row = Array.lastNonEmpty(rows)
  const previousRows = Array.initNonEmpty(rows)

  const rulesForType = allRules[row.event._tag]
  if (!rulesForType) {
    return Either.void
  }
  const rules = Array.ensure(rulesForType)
  const failures: Array<string> = []

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
      failures.push(
        `${row.position} ${row.event._tag} should be preceded by one of ${Inspectable.toStringUnknown(rule.permittedPrecedingEvents)} is preceded by ${Inspectable.toStringUnknown(pertinentPrecedingEvents)}`,
      )
    }
  })

  return Array.match(failures, { onEmpty: () => Either.void, onNonEmpty: Either.left })
}

Array.forEach(examples, (example, i) => {
  const exampleNumber = i + 1
  const actualResult = sanityCheck(Array.map(example.sequence, (event, i) => ({ position: i + 1, event })))

  if (example.expectation === 'pass' && Either.isLeft(actualResult)) {
    console.log(`Example ${exampleNumber} expected to pass but failed: ${actualResult.left.join(', ')}`)
  } else if (example.expectation === 'fail' && Either.isRight(actualResult)) {
    console.log(`Example ${exampleNumber} expected to fail but passed`)
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
  Effect.andThen(rows => Array.map(rows, (row, i) => sanityCheck(Array.take(rows, i + 1)))),
  Effect.andThen(results =>
    Effect.gen(function* () {
      const failures = Array.flatten(Array.getLefts(results))

      if (Array.isEmptyReadonlyArray(failures)) {
        return
      }

      yield* Effect.forEach(failures, failure => Console.log(failure))
    }),
  ),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layer({ url: `file:${path.resolve(import.meta.dirname, '..', 'data', 'events.db')}` }),
      SensitiveDataStoreStub,
    ),
  ),
)

void Effect.runPromise(program)
