import { Context, type Effect, Layer } from 'effect'
import { UnableToQuery } from '../../Queries.ts'
import type { GetPage } from './GetPage/index.ts'

export class ContentfulPages extends Context.Tag('ContentfulPages')<
  ContentfulPages,
  {
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPage>>,
      Effect.Effect.Error<ReturnType<typeof GetPage>>
    >
  }
>() {
  static readonly layer = Layer.succeed(this, {
    getPage: () => new UnableToQuery({ cause: 'not implemented' }),
  })
}
