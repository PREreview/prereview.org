import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { SendMessage } from './SendMessage/index.ts'

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

const make: Effect.Effect<typeof CoarNotify.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    sendMessage: flow(SendMessage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CoarNotify, make)
