import { Context, Effect, Layer, Option, pipe, Record } from 'effect'
import { Locale } from '../Context.ts'
import { ContentfulPages } from '../ExternalInteractions/ContentfulPages/index.ts'
import { GhostPage } from '../ExternalInteractions/index.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { html } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { UnableToQuery } from '../Queries.ts'
import * as Routes from '../routes.ts'
import type { Slug } from '../types/Slug.ts'
import type { Page } from './Types.ts'

export class CmsContent extends Context.Tag('CmsContent')<
  CmsContent,
  {
    getPage: (slug: Slug, preview?: boolean) => Effect.Effect<Page, UnableToQuery, Locale>
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const loadPagesFromContentful = yield* FeatureFlags.loadPagesFromContentful
      const getPageFromGhost = yield* GhostPage.GetPageFromGhost
      const contentfulPages = yield* ContentfulPages

      if (loadPagesFromContentful) {
        return {
          getPage: contentfulPages.getPage,
        }
      }

      return {
        getPage: (slug, preview = false) =>
          preview
            ? new UnableToQuery({ cause: 'not implemented' })
            : pipe(
                Effect.gen(function* () {
                  const locale = yield* Locale
                  const page = yield* getPageFromGhost(slug)

                  return { ...page, title: getTitle(slug, locale) }
                }),
                Effect.catchTag('PageIsUnavailable', error => new UnableToQuery({ cause: error })),
              ),
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
