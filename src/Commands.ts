import { Data, type Either, type Option, type Types } from 'effect'
import type * as Events from './Events.ts'

export interface Command<
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
> {
  name: string
  createFilter: (...input: Input) => Events.EventFilter<EventTags>
  foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
  decide: (state: State, ...input: Input) => Either.Either<Option.Option<Events.Event>, Error>
}

export const Command: <EventTags extends Types.Tags<Events.Event>, Input extends ReadonlyArray<unknown>, State, Error>(
  command: Command<EventTags, Input, State, Error>,
) => Command<EventTags, Input, State, Error> = Data.struct
