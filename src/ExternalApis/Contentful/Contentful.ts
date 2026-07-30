import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { ContentfulConfig } from './ContentfulConfig.ts'
import { GetEntries } from './GetEntries/index.ts'

export class Contentful extends Context.Tag('Contentful')<
  Contentful,
  {
    getEntries: (
      ...args: Parameters<typeof GetEntries>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetEntries>>,
      Effect.Effect.Error<ReturnType<typeof GetEntries>>
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(
        Effect.context<ContentfulConfig | HttpClient.HttpClient>(),
        Context.omit(Scope.Scope),
      )

      return {
        getEntries: flow(GetEntries, Effect.provide(context)),
      }
    }),
  )
}
