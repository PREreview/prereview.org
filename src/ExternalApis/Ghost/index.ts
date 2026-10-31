import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetPage } from './GetPage/index.ts'
import type { GhostApi } from './GhostApi.ts'

export { GhostPageNotFound, GhostPageUnavailable } from './GetPage/index.ts'
export * from './GhostApi.ts'
export { Page } from './Page.ts'

export class Ghost extends Context.Service<
  Ghost,
  {
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetPage>>, Effect.Error<ReturnType<typeof GetPage>>>
  }
>()('Ghost') {}

export const getPage = (...args: Parameters<(typeof Ghost.Service)['getPage']>) =>
  Effect.flatMap(Ghost, service => service.getPage(...args))

const make: Effect.Effect<typeof Ghost.Service, never, GhostApi | HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<GhostApi | HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getPage: flow(GetPage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Ghost, make)
