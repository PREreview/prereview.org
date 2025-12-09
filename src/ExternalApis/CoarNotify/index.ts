import type { HttpClient } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import { type SendMessage, UnableToSendCoarNotifyMessage } from './SendMessage/index.ts'

export { UnableToSendCoarNotifyMessage } from './SendMessage/index.ts'
export * from './Types.ts'

export class CoarNotify extends Context.Tag('CoarNotify')<
  CoarNotify,
  {
    sendMessage: (
      ...args: Parameters<typeof SendMessage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof SendMessage>>,
      Effect.Effect.Error<ReturnType<typeof SendMessage>>
    >
  }
>() {}

export const { sendMessage } = Effect.serviceFunctions(CoarNotify)

const make: Effect.Effect<typeof CoarNotify.Service, never, HttpClient.HttpClient> = Effect.succeed({
  sendMessage: () => new UnableToSendCoarNotifyMessage({ cause: 'not implemented' }),
})

export const layer = Layer.effect(CoarNotify, make)
