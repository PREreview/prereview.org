import { Effect } from 'effect'
import { Locale } from '../Context.ts'
import { GhostPage } from '../ExternalInteractions/index.ts'
import { fixHeadingLevels, html, plainText } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import * as Routes from '../routes.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageResponse } from './Response/index.ts'

export const FundingPage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('Funding')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: GhostPage.GhostPage; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('funding', 'howWeFunded')()),
    main: html`
      <h1>${t('funding', 'howWeFunded')()}</h1>

      ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
    `,
    canonical: Routes.Funding,
    current: 'funding',
  })
}
