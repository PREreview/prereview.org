import { Array, Equal, identity, Option, Record, Schema, Struct, type Types } from 'effect'

export interface AnyEvent {
  readonly _tag: string
}

export interface EventSchema<E extends AnyEvent> {
  readonly Type: E
  readonly members: ReadonlyArray<{ readonly identifier: string; readonly fields: Schema.Struct.Fields }>
}

export type EventFilter<E extends AnyEvent> = ClauseInput<E> | Array.NonEmptyReadonlyArray<ClauseInput<E>>

export interface MakeEventFilter<E extends AnyEvent> {
  <const C extends ClauseInput<E>>(filter: C & ValidateClause<E, C>): C
  <const C extends Array.NonEmptyReadonlyArray<ClauseInput<E>>>(filter: C & ValidateClauses<E, C>): C
}

export const make = <E extends AnyEvent>(): MakeEventFilter<E> => identity

export interface Matches<E extends AnyEvent> {
  <F extends EventFilter<E>>(event: E, filter: F): event is EventsForFilter<E, F>
  <F extends EventFilter<E>>(filter: F): (event: E) => event is EventsForFilter<E, F>
}

export const matches = <E extends AnyEvent>(schema: EventSchema<E>): Matches<E> => {
  const matchesFilter = (event: E, filter: EventFilter<E>) =>
    Array.some(Array.ensure(filter), filter => {
      if (!Array.contains(filter.types, event._tag)) {
        return false
      }

      if (!filter.predicates || Struct.keys(filter.predicates).length === 0) {
        return true
      }

      const predicateEncoder = Schema.Struct<Schema.Struct.Fields>(
        Struct.pick(
          Option.getOrThrow(Array.findFirst(schema.members, member => Array.contains(filter.types, member.identifier)))
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

  return ((eventOrFilter: E | EventFilter<E>, maybeFilter?: EventFilter<E>) => {
    if (maybeFilter === undefined) {
      const filter = eventOrFilter as EventFilter<E>
      return (event: E) => matchesFilter(event, filter)
    }

    return matchesFilter(eventOrFilter as E, maybeFilter)
  }) as Matches<E>
}

export type EventsForFilter<E extends AnyEvent, F extends EventFilter<E>> = EventSubset<E, TagsFromFilter<E, F>>

export type EventSubset<
  E extends AnyEvent,
  SubsetTags extends Types.Tags<E> | ReadonlyArray<Types.Tags<E>>,
> = Types.ExtractTag<E, SubsetTags extends ReadonlyArray<unknown> ? SubsetTags[number] : SubsetTags>

interface ClauseInput<E extends AnyEvent> {
  readonly types: Array.NonEmptyReadonlyArray<Types.Tags<E>>
  readonly predicates?: Readonly<Record<string, unknown>>
}

type PredicatesFor<E extends AnyEvent, T extends Types.Tags<E>> = Partial<
  Types.UnionToIntersection<Omit<EventSubset<E, T>, '_tag'>>
>

type ValidatePredicates<E extends AnyEvent, P, T extends Types.Tags<E>> =
  P extends PredicatesFor<E, T> ? Types.NoExcessProperties<PredicatesFor<E, T>, P> : never

type ValidateClause<E extends AnyEvent, C> = C extends {
  readonly types: infer TTypes extends Array.NonEmptyReadonlyArray<Types.Tags<E>>
}
  ? Omit<C, 'predicates'> &
      (C extends { readonly predicates: infer P }
        ? { readonly predicates: ValidatePredicates<E, P, TTypes[number]> }
        : { readonly predicates?: undefined })
  : never

type ValidateClauses<E extends AnyEvent, T extends Array.NonEmptyReadonlyArray<ClauseInput<E>>> = {
  readonly [K in keyof T]: ValidateClause<E, T[K]>
}

type TagsFromFilter<E extends AnyEvent, F> =
  F extends ReadonlyArray<infer C>
    ? C extends { types: ReadonlyArray<infer T> }
      ? T & Types.Tags<E>
      : never
    : F extends { types: ReadonlyArray<infer T> }
      ? T & Types.Tags<E>
      : never
