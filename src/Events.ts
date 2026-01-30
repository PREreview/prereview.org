import { Array, Context, Effect, Function, Layer, PubSub, Record, Schema, Struct, type Types, flow, pipe } from 'effect'
import * as CommentEvents from './Comments/Events.ts' // eslint-disable-line import/no-internal-modules
import * as DatasetReviewEvents from './DatasetReviews/Events.ts' // eslint-disable-line import/no-internal-modules
import * as PrereviewerEvents from './Prereviewers/Events.ts' // eslint-disable-line import/no-internal-modules
import * as ReviewRequestsEvents from './ReviewRequests/Events.ts' // eslint-disable-line import/no-internal-modules

export * from './Comments/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './DatasetReviews/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './Prereviewers/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './ReviewRequests/Events.ts' // eslint-disable-line import/no-internal-modules

export type Event = typeof Event.Type

export const Event = Schema.Union(
  ...CommentEvents.CommentEvent.members,
  ...DatasetReviewEvents.DatasetReviewEvent.members,
  PrereviewerEvents.PrereviewerEvent,
  ...ReviewRequestsEvents.ReviewRequestEvent.members,
)

export type EventFilter<T extends Types.Tags<Event>> =
  | {
      types: Array.NonEmptyReadonlyArray<T>
      predicates?: Partial<Omit<EventSubset<T>, '_tag'>>
    }
  | Array.NonEmptyReadonlyArray<{
      types: Array.NonEmptyReadonlyArray<T>
      predicates?: Partial<Omit<EventSubset<T>, '_tag'>>
    }>

export const EventFilter = <T extends Types.Tags<Event>>(filter: EventFilter<T>) => filter

export const matches: {
  <T extends Types.Tags<Event>>(event: Event, filter: EventFilter<T>): event is EventSubset<T>
  <T extends Types.Tags<Event>>(filter: EventFilter<T>): (event: Event) => event is EventSubset<T>
} = Function.dual(2, <T extends Types.Tags<Event>>(event: Event, filter: EventFilter<T>): event is EventSubset<T> =>
  Array.some(Array.ensure(filter), filter => {
    if (!Array.contains(filter.types, event._tag)) {
      return false
    }

    return Record.isSubrecord(filter.predicates ?? Record.empty(), event as never)
  }),
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

export type EventSubset<SubsetTags extends Types.Tags<Event> | ReadonlyArray<Types.Tags<Event>>> = Types.ExtractTag<
  Event,
  SubsetTags extends ReadonlyArray<unknown> ? SubsetTags[number] : SubsetTags
>

function isA<Tag extends Types.Tags<Event>>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is EventSubset<Tag> => Array.contains(tags, event._tag)
}
