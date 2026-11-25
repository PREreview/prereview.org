import { Schema } from 'effect'
import * as _ from '../../src/EventSourcing/EventFilter.ts'
import { describe, expect, it } from '../vitest.ts'

class ThingStarted extends Schema.TaggedClass<ThingStarted>()('ThingStarted', {
  thingId: Schema.String,
  ownerId: Schema.String,
}) {}

class ThingFinished extends Schema.TaggedClass<ThingFinished>()('ThingFinished', {
  thingId: Schema.String,
}) {}

class ThingMeasured extends Schema.TaggedClass<ThingMeasured>()('ThingMeasured', {
  thingId: Schema.String,
  size: Schema.Number,
  weight: Schema.NumberFromString,
  note: Schema.optionalKey(Schema.String),
  dimensions: Schema.Struct({ width: Schema.Number, height: Schema.Number }),
  tags: Schema.Array(Schema.String),
}) {}

const Event = Schema.Union([ThingStarted, ThingFinished, ThingMeasured])

const EventFilter = _.make(Event)

const matches = _.matches(Event)

const thingStarted = new ThingStarted({ thingId: 'thing', ownerId: 'owner' })

describe('make', () => {
  it('returns the filter', () => {
    const filter = { types: ['ThingStarted'], predicates: { thingId: 'thing' } } as const

    const actual = EventFilter(filter)

    expect(actual).toBe(filter)
  })

  it('accepts predicates on fields encoded as scalars', () => {
    EventFilter({ types: ['ThingMeasured'], predicates: { thingId: 'thing', size: 10, weight: 10, note: 'note' } })
  })

  it('rejects predicates on fields not encoded as scalars', () => {
    // @ts-expect-error dimensions is encoded as an object
    EventFilter({ types: ['ThingMeasured'], predicates: { dimensions: { width: 1, height: 2 } } })
    // @ts-expect-error tags is encoded as an array
    EventFilter({ types: ['ThingMeasured'], predicates: { tags: ['tag'] } })
    EventFilter([
      { types: ['ThingStarted'], predicates: { thingId: 'thing' } },
      // @ts-expect-error dimensions is encoded as an object
      { types: ['ThingMeasured'], predicates: { dimensions: { width: 1, height: 2 } } },
    ])
  })
})

describe('matches', () => {
  it.each([
    ['single type', EventFilter({ types: ['ThingStarted'] })],
    ['multiple types', EventFilter({ types: ['ThingStarted', 'ThingFinished'] })],
    ['single predicate', EventFilter({ types: ['ThingStarted'], predicates: { thingId: 'thing' } })],
    [
      'multiple predicates',
      EventFilter({ types: ['ThingStarted'], predicates: { thingId: 'thing', ownerId: 'owner' } }),
    ],
    [
      'multiple types and a predicate',
      EventFilter({ types: ['ThingStarted', 'ThingFinished'], predicates: { thingId: 'thing' } }),
    ],
    [
      'multiple clauses',
      EventFilter([
        { types: ['ThingFinished'], predicates: { thingId: 'thing' } },
        { types: ['ThingStarted'], predicates: { ownerId: 'owner' } },
      ]),
    ],
  ])('when the event matches the filter (%s)', (_name, filter) => {
    expect(matches(thingStarted, filter)).toBeTruthy()
    expect(matches(filter)(thingStarted)).toBeTruthy()
  })

  it.each([
    ['single type', EventFilter({ types: ['ThingFinished'] })],
    ['single predicate', EventFilter({ types: ['ThingStarted'], predicates: { thingId: 'other' } })],
    [
      'one of multiple predicates',
      EventFilter({ types: ['ThingStarted'], predicates: { thingId: 'thing', ownerId: 'other' } }),
    ],
    [
      'multiple clauses',
      EventFilter([
        { types: ['ThingFinished'], predicates: { thingId: 'thing' } },
        { types: ['ThingStarted'], predicates: { ownerId: 'other' } },
      ]),
    ],
  ])("when the event doesn't match the filter (%s)", (_name, filter) => {
    expect(matches(thingStarted, filter)).toBeFalsy()
    expect(matches(filter)(thingStarted)).toBeFalsy()
  })
})
