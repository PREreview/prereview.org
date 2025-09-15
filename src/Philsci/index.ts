import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetEprint } from './GetEprint/index.js'

export { Eprint } from './Eprint.js'

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
  const context = yield* Effect.context<HttpClient.HttpClient>()

  return {
    getEprint: flow(GetEprint, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Philsci, make)
