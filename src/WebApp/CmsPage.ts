import { Effect, Option, Record } from 'effect'
import { CmsContent } from '../CmsContent/index.ts'
import { Locale } from '../Context.ts'
import { fixHeadingLevels, html, plainText } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate } from '../locales/index.ts'
import * as Routes from '../routes.ts'
import { Slug } from '../types/Slug.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageResponse } from './Response/index.ts'

export const CmsPage = Effect.fnUntraced(
  function* ({
    canonical,
    current,
    preview = false,
  }: {
    canonical: `/${string}`
    current?: PageResponse['current']
    preview?: boolean
  }) {
    const cmsContent = yield* CmsContent
    const locale = yield* Locale
    const t = translate(locale)

    const slug = Slug(canonical.slice(1))

    const content = yield* cmsContent.getPage(slug, preview)

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

    const title = Option.getOrElse(Record.get(titles, canonical as never), () => () => 'Unknown page')()

    return PageResponse({
      title: plainText(title),
      main: html`
        <h1>${title}</h1>

        ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
        <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
      `,
      canonical,
      current,
    })
  },
  Effect.catchAll(() => HavingProblemsPage),
)
