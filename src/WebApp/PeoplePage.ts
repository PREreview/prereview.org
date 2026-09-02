import { Effect } from 'effect'
import { CmsContent, type Page } from '../CmsContent/index.ts'
import { Locale } from '../Context.ts'
import { fixHeadingLevels, html, plainText } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import * as Routes from '../routes.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageResponse } from './Response/index.ts'

export const PeoplePage = Effect.gen(function* () {
  const cmsContent = yield* CmsContent
  const locale = yield* Locale

  const content = yield* cmsContent.getPage('People')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Page; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('people', 'people')()),
    main: html`
      <h1>${t('people', 'people')()}</h1>

      ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
    `,
    canonical: Routes.People,
    current: 'people',
  })
}
