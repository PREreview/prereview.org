import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetEprint } from './GetEprint/index.ts'

export { Eprint } from './Eprint.ts'

export class Philsci extends Context.Tag('Philsci')<
  Philsci,
  {
    getEprint: (
      ...args: Parameters<typeof GetEprint>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetEprint>>,
      Effect.Effect.Error<ReturnType<typeof GetEprint>>
    >
  }
>() {}

export const { getEprint } = Effect.serviceFunctions(Philsci)

const make: Effect.Effect<typeof Philsci.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getEprint: flow(GetEprint, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Philsci, make)
