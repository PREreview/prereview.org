import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Locale } from '../../Context.ts'
import type { Contentful } from '../../ExternalApis/Contentful/index.ts'
import type { Prereviews } from '../../Domain/Prereviews/index.ts'
import { DynamicEmbedder } from './DynamicEmbedder.ts'
import { GetBlogPost } from './GetBlogPost/index.ts'
import { GetPage } from './GetPage/index.ts'
import { GetPageOfBlogPosts } from './GetPageOfBlogPosts/index.ts'
import { GetPageOfBlogPostsForTag } from './GetPageOfBlogPostsForTag/index.ts'

export class ContentfulPages extends Context.Service<
  ContentfulPages,
  {
    getBlogPost: (
      ...args: Parameters<typeof GetBlogPost>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetBlogPost>>, Effect.Error<ReturnType<typeof GetBlogPost>>>
    getPage: (
      ...args: Parameters<typeof GetPage>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetPage>>, Effect.Error<ReturnType<typeof GetPage>>, Locale>
    getPageOfBlogPosts: (
      ...args: Parameters<typeof GetPageOfBlogPosts>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetPageOfBlogPosts>>,
      Effect.Error<ReturnType<typeof GetPageOfBlogPosts>>
    >
    getPageOfBlogPostsForTag: (
      ...args: Parameters<typeof GetPageOfBlogPostsForTag>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetPageOfBlogPostsForTag>>,
      Effect.Error<ReturnType<typeof GetPageOfBlogPostsForTag>>
    >
  }
>()('ContentfulPages') {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.map(
        Effect.context<Contentful | DynamicEmbedder | Prereviews>(),
        Context.omit(Scope.Scope),
      )

      return {
        getBlogPost: flow(GetBlogPost, Effect.provide(context)),
        getPage: flow(GetPage, Effect.provide(context)),
        getPageOfBlogPosts: flow(GetPageOfBlogPosts, Effect.provide(context)),
        getPageOfBlogPostsForTag: flow(GetPageOfBlogPostsForTag, Effect.provide(context)),
      }
    }),
  ).pipe(Layer.provide(DynamicEmbedder.layer))
}
