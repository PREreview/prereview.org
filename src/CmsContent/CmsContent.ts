import { Context, Effect, HashSet, Layer, Option, pipe, Record } from 'effect'
import type { Locale } from '../Context.ts'
import { Queries } from '../Domain/Events/index.ts'
import { ContentfulPages } from '../ExternalInteractions/ContentfulPages/index.ts'
import { GhostPage } from '../ExternalInteractions/index.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { html } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import * as Routes from '../routes.ts'
import type { Slug } from '../types/Slug.ts'
import type { PageNotFound } from './Errors.ts'
import type { BlogPost, Page, PageOfBlogPosts } from './Types.ts'

export class CmsContent extends Context.Service<
  CmsContent,
  {
    getPage: (slug: Slug, preview?: boolean) => Effect.Effect<Page, Queries.UnableToQuery, Locale>
    getBlogPost: (slug: Slug, preview?: boolean) => Effect.Effect<BlogPost, Queries.UnableToQuery, Locale>
    getPageOfBlogPosts: (
      channel: 'blog' | 'newsletter' | 'weeknote',
      page: number,
    ) => Effect.Effect<PageOfBlogPosts, Queries.UnableToQuery | PageNotFound, Locale>
    getPageOfBlogPostsForTag: (
      tag: 'champions-program',
      page: number,
    ) => Effect.Effect<PageOfBlogPosts, Queries.UnableToQuery | PageNotFound, Locale>
  }
>()('CmsContent') {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const loadPagesFromContentful = yield* FeatureFlags.loadPagesFromContentful
      const getPageFromGhost = yield* GhostPage.GetPageFromGhost
      const contentfulPages = yield* ContentfulPages

      if (loadPagesFromContentful) {
        return {
          getPage: contentfulPages.getPage,
          getBlogPost: contentfulPages.getBlogPost,
          getPageOfBlogPosts: contentfulPages.getPageOfBlogPosts,
          getPageOfBlogPostsForTag: contentfulPages.getPageOfBlogPostsForTag,
        }
      }

      return {
        getPage: (slug, preview = false) =>
          preview
            ? new Queries.UnableToQuery({ cause: 'not implemented' })
            : pipe(
                Effect.gen(function* () {
                  const page = yield* getPageFromGhost(slug)

                  return { ...page, title: getTitle(slug, page.locale), js: HashSet.empty() }
                }),
                Effect.catchTag('PageIsUnavailable', error => new Queries.UnableToQuery({ cause: error })),
              ),
        getBlogPost: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
        getPageOfBlogPosts: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
        getPageOfBlogPostsForTag: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
      }
    }),
  )
}

const getTitle = (slug: Slug, locale: SupportedLocale) => {
  const t = translate(locale)

  const titles = {
    [Routes.AboutUs]: t('about-us', 'title'),
    [Routes.ChampionsProgram]: t('champions-program', 'title'),
    [Routes.Clubs]: t('clubs', 'clubs'),
    [Routes.CodeOfConduct]: t('code-of-conduct', 'codeOfConduct'),
    [Routes.EdiaStatement]: t('edia-statement', 'ediaStatement'),
    [Routes.Funding]: t('funding', 'howWeFunded'),
    [Routes.HowToUse]: t('how-to-use', 'howToUse'),
    [Routes.LiveReviews]: t('live-reviews', 'liveReviews'),
    [Routes.People]: t('people', 'people'),
    [Routes.PrivacyPolicy]: t('privacy-policy', 'privacyPolicy'),
    [Routes.Resources]: t('resources', 'resources'),
    [Routes.Trainings]: t('trainings', 'trainings'),
  }

  return Option.getOrElse(Record.get(titles, `/${slug}` as never), () => () => html`Unknown page`)()
}
