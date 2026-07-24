import { Context, Effect, Layer } from 'effect'
import { ContentfulIsUnavailable } from './Errors.ts'
import type { GetEntries } from './GetEntries/index.ts'

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
    Effect.sync(() => {
      return {
        getEntries: () => new ContentfulIsUnavailable({ cause: 'not implemented' }),
      }
    }),
  )
}
