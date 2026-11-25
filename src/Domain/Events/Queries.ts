import { identity, type Result } from 'effect'
import { Queries as GenericQueries } from '../../EventSourcing/index.ts'
import { EventStore } from './EventStore.ts'
import type { Event, EventFilter, EventsForFilter } from './Events.ts'
import * as StatefulQueries from './StatefulQueries.ts'

export const UnableToQuery = GenericQueries.UnableToQuery

export type UnableToQuery = GenericQueries.UnableToQuery

export const UnexpectedSequenceOfEvents = GenericQueries.UnexpectedSequenceOfEvents

export type UnexpectedSequenceOfEvents = GenericQueries.UnexpectedSequenceOfEvents

/** @deprecated */
export type Query<F extends (...args: never) => unknown, E = never> = GenericQueries.Query<F, E>

export type QueryInput = GenericQueries.QueryInput

export type FromStatefulQuery<T> = GenericQueries.FromStatefulQuery<Event, T>

export type FromOnDemandQuery<T> = GenericQueries.FromOnDemandQuery<Event, T>

export type OnDemandQuery<Input extends QueryInput, Result, Error = never> = GenericQueries.OnDemandQuery<
  Event,
  Input,
  Result,
  Error
>

export type StatefulQuery<
  Input extends QueryInput,
  Result,
  Error = never,
  State = unknown,
> = GenericQueries.StatefulQuery<Event, Input, Result, Error, State>

export const OnDemandQuery: <Input extends QueryInput, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => OnDemandQuery<Input, Result, Error> = identity

export const StatefulQuery: <Input extends QueryInput, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => StatefulQuery<Input, Result, Error, State> = identity

export const makeOnDemandQuery = <Input extends QueryInput, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => GenericQueries.makeOnDemandQuery(EventStore, query)

export const makeStatefulQuery = <Input extends QueryInput, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => GenericQueries.makeStatefulQuery(StatefulQueries.StatefulQueries, query)

/** @deprecated */
export const makeQuery = <Filter extends EventFilter, Input, Result, Error>(
  name: string,
  createFilter: (input: Input) => Filter,
  query: (
    events: ReadonlyArray<EventsForFilter<Filter>>,
    input: Input,
  ) => Result.Result<Result, GenericQueries.UnexpectedSequenceOfEvents | Error>,
) => GenericQueries.makeQuery(EventStore, name, createFilter, query)
