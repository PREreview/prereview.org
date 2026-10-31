import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetEprint } from './GetEprint/index.ts'

export { Eprint } from './Eprint.ts'

export class Philsci extends Context.Service<
  Philsci,
  {
    getEprint: (
      ...args: Parameters<typeof GetEprint>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetEprint>>, Effect.Error<ReturnType<typeof GetEprint>>>
  }
>()('Philsci') {}

export const getEprint = (...args: Parameters<(typeof Philsci.Service)['getEprint']>) =>
  Effect.flatMap(Philsci, service => service.getEprint(...args))

const make: Effect.Effect<typeof Philsci.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getEprint: flow(GetEprint, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Philsci, make)
