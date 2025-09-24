import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetRecord } from './Record.ts'

export { Record } from './Record.ts'

export class JapanLinkCenter extends Context.Tag('JapanLinkCenter')<
  JapanLinkCenter,
  {
    getRecord: (
      ...args: Parameters<typeof GetRecord>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetRecord>>,
      Effect.Effect.Error<ReturnType<typeof GetRecord>>
    >
  }
>() {}

export const { getRecord } = Effect.serviceFunctions(JapanLinkCenter)

const make: Effect.Effect<typeof JapanLinkCenter.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.context<HttpClient.HttpClient>()

  return {
    getRecord: flow(GetRecord, Effect.provide(context)),
  }
})

export const layer = Layer.effect(JapanLinkCenter, make)
