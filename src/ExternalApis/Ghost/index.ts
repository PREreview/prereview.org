import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetPage } from './GetPage/index.js'
import type { GhostApi } from './GhostApi.js'

export { GhostPageNotFound, GhostPageUnavailable } from './GetPage/index.js'
export * from './GhostApi.js'
export { Page } from './Page.js'

export class Ghost extends Context.Tag('Ghost')<
  Ghost,
  {
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPage>>,
      Effect.Effect.Error<ReturnType<typeof GetPage>>
    >
  }
>() {}

export const { getPage } = Effect.serviceFunctions(Ghost)

const make: Effect.Effect<typeof Ghost.Service, never, GhostApi | HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.context<GhostApi | HttpClient.HttpClient>()

  return {
    getPage: flow(GetPage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Ghost, make)
