// oxlint-disable module-boundaries/use-index
import { identity } from 'effect'
import * as GenericCommands from '../../EventSourcing/Commands.ts'
import { EventStore } from './EventStore.ts'
import type { Event } from './Events.ts'

export {
  UnableToHandleCommand,
  type CommandInput,
  type FromCommand,
  type FromStatelessCommand,
} from '../../EventSourcing/Commands.ts'

export type Command<
  Input extends GenericCommands.CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
> = GenericCommands.Command<Event, Input, State, Error, Authorize>

export type StatelessCommand<Input extends GenericCommands.CommandInput> = GenericCommands.StatelessCommand<
  Event,
  Input
>

export const Command: <Input extends GenericCommands.CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<Input, State, Error, Authorize>,
) => Command<Input, State, Error, Authorize> = identity

export const StatelessCommand: <Input extends GenericCommands.CommandInput>(
  command: StatelessCommand<Input>,
) => StatelessCommand<Input> = identity

export const makeCommand = <
  Input extends GenericCommands.CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
>(
  command: Command<Input, State, Error, Authorize>,
) => GenericCommands.makeCommand(EventStore, command)

export const makeStatelessCommand = <Input extends GenericCommands.CommandInput>(command: StatelessCommand<Input>) =>
  GenericCommands.makeStatelessCommand(EventStore, command)
