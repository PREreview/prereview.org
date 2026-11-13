import {
  Array,
  Context,
  Effect,
  Equal,
  Layer,
  Option,
  PubSub,
  Record,
  Schema,
  Struct,
  type Types,
  flow,
  pipe,
} from 'effect'
// oxlint-disable  module-boundaries/use-index
import * as AuthorInviteEvents from './Domain/AuthorInvites/Events.ts'
import * as CommentEvents from './Domain/Comments/Events.ts'
import * as ContactEmailAddressesEvents from './ContactEmailAddresses/Events.ts'
import * as DatasetReviewEvents from './DatasetReviews/Events.ts'
import * as PreprintReviews from './PreprintReviews/Events.ts'
import * as PrereviewerEvents from './Prereviewers/Events.ts'
import * as ReviewRequestsEvents from './ReviewRequests/Events.ts'

export * from './Domain/AuthorInvites/Events.ts'
export * from './Domain/Comments/Events.ts'
export * from './ContactEmailAddresses/Events.ts'
export * from './DatasetReviews/Events.ts'
export * from './PreprintReviews/Events.ts'
export * from './Prereviewers/Events.ts'
export * from './ReviewRequests/Events.ts'

export type Event = typeof Event.Type

export const Event = Schema.Union([
  ...AuthorInviteEvents.AuthorInviteEvent.members,
  ...CommentEvents.CommentEvent.members,
  ContactEmailAddressesEvents.ContactAddressImported,
  ContactEmailAddressesEvents.ContactAddressVerified,
  ContactEmailAddressesEvents.ContactAddressRecorded,
  ContactEmailAddressesEvents.EmailToVerifyContactAddressSent,
  ContactEmailAddressesEvents.AuthorInviteEmailAddressChosenAsContactAddress,
  ...DatasetReviewEvents.DatasetReviewEvent.members,
  ...ReviewRequestsEvents.ReviewRequestEvent.members,
  PreprintReviews.RapidPrereviewImported,
  PreprintReviews.PreprintReviewImported,
  PreprintReviews.EmailToNotifyPrereviewerOfAPrereviewWasSent,
  ...PrereviewerEvents.PrereviewerEvent.members,
])

type PredicatesFor<T extends Types.Tags<Event>> = Partial<Types.UnionToIntersection<Omit<EventSubset<T>, '_tag'>>>

interface EventFilterClauseInput {
  readonly types: Array.NonEmptyReadonlyArray<Types.Tags<Event>>
  readonly predicates?: Readonly<Record<string, unknown>>
}

type ValidatePredicates<P, T extends Types.Tags<Event>> =
  P extends PredicatesFor<T> ? Types.NoExcessProperties<PredicatesFor<T>, P> : never

type ValidateClause<C> = C extends {
  readonly types: infer TTypes extends Array.NonEmptyReadonlyArray<Types.Tags<Event>>
}
  ? Omit<C, 'predicates'> &
      (C extends { readonly predicates: infer P }
        ? { readonly predicates: ValidatePredicates<P, TTypes[number]> }
        : { readonly predicates?: undefined })
  : never

type ValidateClauses<T extends Array.NonEmptyReadonlyArray<EventFilterClauseInput>> = {
  readonly [K in keyof T]: ValidateClause<T[K]>
}

export type EventFilter = EventFilterClauseInput | Array.NonEmptyReadonlyArray<EventFilterClauseInput>

export function EventFilter<const C extends EventFilterClauseInput>(filter: C & ValidateClause<C>): C
export function EventFilter<const C extends Array.NonEmptyReadonlyArray<EventFilterClauseInput>>(
  //oxlint-disable-next-line unified-signatures
  filter: C & ValidateClauses<C>,
): C
export function EventFilter(filter: EventFilter) {
  return filter
}

type TagsFromFilter<F> =
  F extends ReadonlyArray<infer C>
    ? C extends { types: ReadonlyArray<infer T> }
      ? T & Types.Tags<Event>
      : never
    : F extends { types: ReadonlyArray<infer T> }
      ? T & Types.Tags<Event>
      : never

export function matches<F extends EventFilter>(event: Event, filter: F): event is EventSubset<TagsFromFilter<F>>
export function matches<F extends EventFilter>(filter: F): (event: Event) => event is EventSubset<TagsFromFilter<F>>
export function matches<F extends EventFilter>(
  eventOrFilter: Event | F,
  maybeFilter?: F,
): boolean | ((event: Event) => boolean) {
  if (maybeFilter === undefined) {
    const filter = eventOrFilter as F
    return (event: Event): event is EventSubset<TagsFromFilter<F>> => matches(event, filter)
  }

  const event = eventOrFilter as Event
  const filter = maybeFilter

  return Array.some(Array.ensure(filter), filter => {
    if (!Array.contains(filter.types, event._tag)) {
      return false
    }

    if (!filter.predicates || Struct.keys(filter.predicates).length === 0) {
      return true
    }

    const predicateEncoder = Schema.Struct<Schema.Struct.Fields>(
      Struct.pick(
        Option.getOrThrow(Array.findFirst(Event.members, member => Array.contains(filter.types, member.identifier)))
          .fields as never,
        Record.keys(filter.predicates) as never,
      ),
    )

    const encodedPredicates = Schema.encodeSync(predicateEncoder as unknown as Schema.Codec<unknown, unknown>)(
      filter.predicates,
    )
    const encodedEvent = Schema.encodeSync(predicateEncoder as unknown as Schema.Codec<unknown, unknown>)(event)

    return Equal.equals(encodedPredicates, encodedEvent)
  })
}

export const EventTypes = Array.map(Event.members, member => member.identifier as Event['_tag'])

const CommentEventTypes = Array.map(
  CommentEvents.CommentEvent.members,
  member => member.identifier as CommentEvents.CommentEvent['_tag'],
)

export class Events extends Context.Service<Events, PubSub.PubSub<Event>>()('Events') {}

export const isCommentEvent: (event: Event) => event is CommentEvents.CommentEvent = isA(...CommentEventTypes)

export const layer = Layer.effect(
  Events,
  Effect.acquireRelease(
    pipe(PubSub.unbounded<Event>(), Effect.tap(Effect.logDebug('Events started'))),
    flow(PubSub.shutdown, Effect.tap(Effect.logDebug('Events stopped'))),
  ),
)

export type EventsForFilter<F extends EventFilter> = EventSubset<TagsFromFilter<F>>

export type EventSubset<SubsetTags extends Types.Tags<Event> | ReadonlyArray<Types.Tags<Event>>> = Types.ExtractTag<
  Event,
  SubsetTags extends ReadonlyArray<unknown> ? SubsetTags[number] : SubsetTags
>

function isA<Tag extends Types.Tags<Event>>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is EventSubset<Tag> => Array.contains(tags, event._tag)
}
