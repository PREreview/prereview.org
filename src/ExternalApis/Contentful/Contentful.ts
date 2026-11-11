import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { ContentfulConfig } from './ContentfulConfig.ts'
import { GetAssets } from './GetAssets/index.ts'
import { GetEntries } from './GetEntries/index.ts'

export class Contentful extends Context.Service<
  Contentful,
  {
    getAssets: (
      ...args: Parameters<typeof GetAssets>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetAssets>>, Effect.Error<ReturnType<typeof GetAssets>>>
    getEntries: (
      ...args: Parameters<typeof GetEntries>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetEntries>>, Effect.Error<ReturnType<typeof GetEntries>>>
  }
>()('Contentful') {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.map(
        Effect.context<ContentfulConfig | HttpClient.HttpClient>(),
        Context.omit(Scope.Scope),
      )

      return {
        getAssets: flow(GetAssets, Effect.provide(context)),
        getEntries: flow(GetEntries, Effect.provide(context)),
      }
    }),
  )
}
