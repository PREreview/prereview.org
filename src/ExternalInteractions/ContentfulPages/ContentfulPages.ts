import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Locale } from '../../Context.ts'
import type { Contentful } from '../../ExternalApis/Contentful/index.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'
import { GetBlogPost } from './GetBlogPost/index.ts'
import { GetPage } from './GetPage/index.ts'
import { GetPageOfBlogPosts } from './GetPageOfBlogPosts/index.ts'

export class ContentfulPages extends Context.Tag('ContentfulPages')<
  ContentfulPages,
  {
    getBlogPost: (
      ...args: Parameters<typeof GetBlogPost>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetBlogPost>>,
      Effect.Effect.Error<ReturnType<typeof GetBlogPost>>
    >
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPage>>,
      Effect.Effect.Error<ReturnType<typeof GetPage>>,
      Locale
    >
    getPageOfBlogPosts: (
      ...args: Parameters<typeof GetPageOfBlogPosts>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPageOfBlogPosts>>,
      Effect.Effect.Error<ReturnType<typeof GetPageOfBlogPosts>>
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(Effect.context<Contentful | DynamicEmbedder>(), Context.omit(Scope.Scope))

      return {
        getBlogPost: flow(GetBlogPost, Effect.provide(context)),
        getPage: flow(GetPage, Effect.provide(context)),
        getPageOfBlogPosts: flow(GetPageOfBlogPosts, Effect.provide(context)),
      }
    }),
  ).pipe(Layer.provide(DynamicEmbedder.layer))
}
