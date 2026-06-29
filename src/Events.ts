import {
  Array,
  Context,
  Data,
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
import * as AuthorInviteEvents from './AuthorInvites/Events.ts' // eslint-disable-line import/no-internal-modules
import * as CommentEvents from './Comments/Events.ts' // eslint-disable-line import/no-internal-modules
import * as ContactEmailAddressesEvents from './ContactEmailAddresses/Events.ts' // eslint-disable-line import/no-internal-modules
import * as DatasetReviewEvents from './DatasetReviews/Events.ts' // eslint-disable-line import/no-internal-modules
import * as PreprintReviews from './PreprintReviews/Events.ts' // eslint-disable-line import/no-internal-modules
import * as PrereviewerEvents from './Prereviewers/Events.ts' // eslint-disable-line import/no-internal-modules
import * as ReviewRequestsEvents from './ReviewRequests/Events.ts' // eslint-disable-line import/no-internal-modules

export * from './AuthorInvites/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './Comments/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './ContactEmailAddresses/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './DatasetReviews/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './PreprintReviews/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './Prereviewers/Events.ts' // eslint-disable-line import/no-internal-modules
export * from './ReviewRequests/Events.ts' // eslint-disable-line import/no-internal-modules

export type Event = typeof Event.Type

export const Event = Schema.Union(
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
  PreprintReviews.EmailToNotifyPrereviewerOfAPrereviewWasSent,
  ...PrereviewerEvents.PrereviewerEvent.members,
)

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
  // eslint-disable-next-line @typescript-eslint/unified-signatures
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

    const predicateEncoder = Schema.pick(...(Record.keys(filter.predicates) as never))(
      Option.getOrThrow(Array.findFirst(Event.members, hasTag(...filter.types))) as never,
    )

    const encodedPredicates = Schema.encodeSync(predicateEncoder as never)(filter.predicates)
    const encodedEvent = Schema.encodeSync(predicateEncoder as never)(event)

    return Equal.equals(Data.struct(encodedPredicates as never), Data.struct(encodedEvent as never))
  })
}

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

export type EventsForFilter<F extends EventFilter> = EventSubset<TagsFromFilter<F>>

export type EventSubset<SubsetTags extends Types.Tags<Event> | ReadonlyArray<Types.Tags<Event>>> = Types.ExtractTag<
  Event,
  SubsetTags extends ReadonlyArray<unknown> ? SubsetTags[number] : SubsetTags
>

function isA<Tag extends Types.Tags<Event>>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is EventSubset<Tag> => Array.contains(tags, event._tag)
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
