import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetRecord } from './GetRecord/index.ts'

export { Record, RecordResponseSchema } from './Record.ts'

export class Datacite extends Context.Tag('Datacite')<
  Datacite,
  {
    getRecord: (
      ...args: Parameters<typeof GetRecord>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetRecord>>,
      Effect.Effect.Error<ReturnType<typeof GetRecord>>
    >
  }
>() {}

export const { getRecord } = Effect.serviceFunctions(Datacite)

const make: Effect.Effect<typeof Datacite.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getRecord: flow(GetRecord, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Datacite, make)
