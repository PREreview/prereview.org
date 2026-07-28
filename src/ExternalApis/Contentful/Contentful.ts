import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { ContentfulConfig } from './ContentfulConfig.ts'
import { ContentfulIsUnavailable } from './Errors.ts'
import { GetEntries } from './GetEntries/index.ts'
import type { GetEntry } from './GetEntry/index.ts'

export class Contentful extends Context.Tag('Contentful')<
  Contentful,
  {
    getEntry: (
      ...args: Parameters<typeof GetEntry>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetEntry>>,
      Effect.Effect.Error<ReturnType<typeof GetEntry>>
    >
  } & {
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
        getEntry: () => new ContentfulIsUnavailable({ cause: 'not implemented' }),
        getEntries: flow(GetEntries, Effect.provide(context)),
      }
    }),
  )
}
