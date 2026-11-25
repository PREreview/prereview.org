import { identity } from 'effect'
import { Commands as GenericCommands } from '../../EventSourcing/index.ts'
import { EventStore } from './EventStore.ts'
import type { Event } from './Events.ts'

export const UnableToHandleCommand = GenericCommands.UnableToHandleCommand

export type UnableToHandleCommand = GenericCommands.UnableToHandleCommand

export type CommandInput = GenericCommands.CommandInput

export type FromCommand<T> = GenericCommands.FromCommand<Event, T>

export type FromStatelessCommand<T> = GenericCommands.FromStatelessCommand<Event, T>

export type Command<
  Input extends CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
> = GenericCommands.Command<Event, Input, State, Error, Authorize>

export type StatelessCommand<Input extends CommandInput> = GenericCommands.StatelessCommand<Event, Input>

export const Command: <Input extends CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<Input, State, Error, Authorize>,
) => Command<Input, State, Error, Authorize> = identity

export const StatelessCommand: <Input extends CommandInput>(
  command: StatelessCommand<Input>,
) => StatelessCommand<Input> = identity

export const makeCommand = <Input extends CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<Input, State, Error, Authorize>,
) => GenericCommands.makeCommand(EventStore, command)

export const makeStatelessCommand = <Input extends CommandInput>(command: StatelessCommand<Input>) =>
  GenericCommands.makeStatelessCommand(EventStore, command)
