import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Contentful } from '../../ExternalApis/Contentful/index.ts'
import { GetPage } from './GetPage/index.ts'

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
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(Effect.context<Contentful>(), Context.omit(Scope.Scope))

      return {
        getPage: flow(GetPage, Effect.provide(context)),
      }
    }),
  )
}
