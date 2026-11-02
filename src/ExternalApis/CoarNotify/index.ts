import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { SendMessage } from './SendMessage/index.ts'

export { UnableToSendCoarNotifyMessage } from './SendMessage/index.ts'
export * from './Types.ts'

export class CoarNotify extends Context.Service<
  CoarNotify,
  {
    sendMessage: (
      ...args: Parameters<typeof SendMessage>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof SendMessage>>, Effect.Error<ReturnType<typeof SendMessage>>>
  }
>()('CoarNotify') {}

export const sendMessage = (...args: Parameters<(typeof CoarNotify.Service)['sendMessage']>) =>
  CoarNotify.use(service => service.sendMessage(...args))

const make: Effect.Effect<typeof CoarNotify.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    sendMessage: flow(SendMessage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CoarNotify, make)
