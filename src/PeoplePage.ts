import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from './Context.js'
import * as GhostPage from './GhostPage/index.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText } from './html.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import * as Routes from './routes.js'

export const PeoplePage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('People')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: GhostPage.GhostPage; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('people', 'people')()),
    main: html`
      <h1>${t('people', 'people')()}</h1>

      ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div lang="${content.locale}" dir="${rtlDetect.getLangDir(content.locale)}">
        ${fixHeadingLevels(1, content.html)}
      </div>
    `,
    canonical: Routes.People,
    current: 'people',
  })
}
