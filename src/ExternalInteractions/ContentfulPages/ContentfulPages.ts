import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Locale } from '../../Context.ts'
import type { Contentful } from '../../ExternalApis/Contentful/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'
import type { GetBlogPost } from './GetBlogPost/index.ts'
import { GetPage } from './GetPage/index.ts'

export class ContentfulPages extends Context.Tag('ContentfulPages')<
  ContentfulPages,
  {
    getBlogPost: (
      ...args: Parameters<typeof GetBlogPost>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetBlogPost>>,
      Effect.Effect.Error<ReturnType<typeof GetBlogPost>>,
      Locale
    >
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPage>>,
      Effect.Effect.Error<ReturnType<typeof GetPage>>,
      Locale
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(Effect.context<Contentful | DynamicEmbedder>(), Context.omit(Scope.Scope))

      return {
        getBlogPost: () => new UnableToQuery({ cause: 'not implemented' }),
        getPage: flow(GetPage, Effect.provide(context)),
      }
    }),
  ).pipe(Layer.provide(DynamicEmbedder.layer))
}
