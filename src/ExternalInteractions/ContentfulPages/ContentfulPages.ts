import { Context, Effect, flow, Layer, Scope } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import type { Contentful } from '../../ExternalApis/Contentful/index.ts'
import { GetPage } from './GetPage/index.ts'

export class ContentfulPages extends Context.Tag('ContentfulPages')<
  ContentfulPages,
  {
    getPage: (
      ...args: Parameters<ReturnType<typeof GetPage>>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<ReturnType<typeof GetPage>>>,
      Effect.Effect.Error<ReturnType<ReturnType<typeof GetPage>>>
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const clubs = yield* Clubs
      const context = yield* Effect.andThen(Effect.context<Contentful>(), Context.omit(Scope.Scope))

      const listOfClubs = yield* clubs.listClubs

      return {
        getPage: flow(GetPage(listOfClubs), Effect.provide(context)),
      }
    }),
  )
}
