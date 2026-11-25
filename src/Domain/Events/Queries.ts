// oxlint-disable module-boundaries/use-index
import { identity, type Result } from 'effect'
import * as GenericQueries from '../../EventSourcing/Queries.ts'
import { EventStore } from './EventStore.ts'
import type { Event, EventFilter, EventsForFilter } from './Events.ts'
import * as StatefulQueries from './StatefulQueries.ts'

export {
  UnableToQuery,
  UnexpectedSequenceOfEvents,
  type FromStatefulQuery,
  type Query,
  type QueryInput,
} from '../../EventSourcing/Queries.ts'

export type FromOnDemandQuery<T> = GenericQueries.FromOnDemandQuery<Event, T>

export type OnDemandQuery<
  Input extends GenericQueries.QueryInput,
  Result,
  Error = never,
> = GenericQueries.OnDemandQuery<Event, Input, Result, Error>

export type StatefulQuery<
  Input extends GenericQueries.QueryInput,
  Result,
  Error = never,
  State = unknown,
> = GenericQueries.StatefulQuery<Event, Input, Result, Error, State>

export const OnDemandQuery: <Input extends GenericQueries.QueryInput, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => OnDemandQuery<Input, Result, Error> = identity

export const StatefulQuery: <Input extends GenericQueries.QueryInput, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => StatefulQuery<Input, Result, Error, State> = identity

export const makeOnDemandQuery = <Input extends GenericQueries.QueryInput, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => GenericQueries.makeOnDemandQuery(EventStore, query)

export const makeStatefulQuery = <Input extends GenericQueries.QueryInput, Result, Error = never, State = unknown>(
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
