import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetWork } from './GetWork/index.ts'

export { Work, WorkResponseSchema } from './Work.ts'

export class Crossref extends Context.Tag('Crossref')<
  Crossref,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetWork>>,
      Effect.Effect.Error<ReturnType<typeof GetWork>>
    >
  }
>() {}

export const { getWork } = Effect.serviceFunctions(Crossref)

const make: Effect.Effect<typeof Crossref.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.context<HttpClient.HttpClient>()

  return {
    getWork: flow(GetWork, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Crossref, make)
