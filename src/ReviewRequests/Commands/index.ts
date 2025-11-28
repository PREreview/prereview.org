import { Context, Data, Effect, Layer } from 'effect'
import type * as EventStore from '../../EventStore.ts'
import type { Uuid } from '../../types/index.ts'
import type * as AcceptReviewRequest from './AcceptReviewRequest.ts'

export class ReviewRequestCommands extends Context.Tag('ReviewRequestCommands')<
  ReviewRequestCommands,
  {
    acceptReviewRequest: CommandHandler<AcceptReviewRequest.Command>
  }
>() {}

type CommandHandler<Command extends { reviewRequestId: Uuid.Uuid }, Error = never> = (
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const { acceptReviewRequest } = Effect.serviceFunctions(ReviewRequestCommands)

const makeReviewRequestCommands: Effect.Effect<typeof ReviewRequestCommands.Service, never, EventStore.EventStore> =
  Effect.sync(() => {
    return {
      acceptReviewRequest: () => new UnableToHandleCommand({ cause: 'not implemented' }),
    }
  })

export const commandsLayer = Layer.effect(ReviewRequestCommands, makeReviewRequestCommands)
