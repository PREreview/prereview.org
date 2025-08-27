import { Array, Context, Effect, Function, Layer, PubSub, Record, Schema, Struct, flow, pipe } from 'effect'
import * as CommentEvents from './Comments/Events.js' // eslint-disable-line import/no-internal-modules
import * as DatasetReviewEvents from './DatasetReviews/Events.js' // eslint-disable-line import/no-internal-modules

export * from './Comments/Events.js' // eslint-disable-line import/no-internal-modules
export * from './DatasetReviews/Events.js' // eslint-disable-line import/no-internal-modules

export type Event = typeof Event.Type

export const Event = Schema.Union(
  ...CommentEvents.CommentEvent.members,
  ...DatasetReviewEvents.DatasetReviewEvent.members,
)

export interface EventFilter<T extends Event['_tag']> {
  types: Array.NonEmptyReadonlyArray<T>
  predicates?: Partial<Omit<Extract<Event, { _tag: T }>, '_tag'>>
}

export const EventFilter = <T extends Event['_tag']>(filter: EventFilter<T>) => filter

export const matches: {
  <T extends Event['_tag']>(event: Event, filter: EventFilter<T>): event is Extract<Event, { _tag: T }>
  <T extends Event['_tag']>(filter: EventFilter<T>): (event: Event) => event is Extract<Event, { _tag: T }>
} = Function.dual(
  2,
  <T extends Event['_tag']>(event: Event, filter: EventFilter<T>): event is Extract<Event, { _tag: T }> => {
    if (!Array.contains(filter.types, event._tag)) {
      return false
    }

    return Record.isSubrecord(filter.predicates ?? Record.empty(), event as never)
  },
)

export const EventTypes = Array.map(Event.members, Struct.get('_tag'))

const CommentEventTypes = Array.map(CommentEvents.CommentEvent.members, Struct.get('_tag'))

export class Events extends Context.Tag('Events')<Events, PubSub.PubSub<Event>>() {}

export const isCommentEvent: (event: Event) => event is CommentEvents.CommentEvent = isA(...CommentEventTypes)

export const layer = Layer.scoped(
  Events,
  Effect.acquireRelease(
    pipe(PubSub.unbounded<Event>(), Effect.tap(Effect.logDebug('Events started'))),
    flow(PubSub.shutdown, Effect.tap(Effect.logDebug('Events stopped'))),
  ),
)

function isA<Tag extends Event['_tag']>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is Extract<Event, { _tag: Tag }> => Array.contains(tags, event._tag)
}
