import { Effect } from 'effect'
import { CmsContent } from '../CmsContent/index.ts'
import { Locale } from '../Context.ts'
import { fixHeadingLevels, html, plainText } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate } from '../locales/index.ts'
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

    return PageResponse({
      title: plainText(content.title),
      main: html`
        <h1><span ${languageAttributesFor(content.locale)}>${content.title}</span></h1>

        ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
        <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
      `,
      canonical,
      current,
    })
  },
  Effect.catchAll(() => HavingProblemsPage),
)
