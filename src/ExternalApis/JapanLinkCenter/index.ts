import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetRecord } from './Record.ts'

export { Record } from './Record.ts'

export class JapanLinkCenter extends Context.Service<
  JapanLinkCenter,
  {
    getRecord: (
      ...args: Parameters<typeof GetRecord>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetRecord>>, Effect.Error<ReturnType<typeof GetRecord>>>
  }
>()('JapanLinkCenter') {}

export const getRecord = (...args: Parameters<(typeof JapanLinkCenter.Service)['getRecord']>) =>
  JapanLinkCenter.use(service => service.getRecord(...args))

const make: Effect.Effect<typeof JapanLinkCenter.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getRecord: flow(GetRecord, Effect.provide(context)),
  }
})

export const layer = Layer.effect(JapanLinkCenter, make)
