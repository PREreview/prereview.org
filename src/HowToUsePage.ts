import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from './Context.ts'
import * as GhostPage from './GhostPage/index.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { fixHeadingLevels, html, plainText } from './html.ts'
import { translate, type SupportedLocale } from './locales/index.ts'
import { PageResponse } from './Response/index.ts'
import * as Routes from './routes.ts'

export const HowToUsePage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('HowToUse')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: GhostPage.GhostPage; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('how-to-use', 'howToUse')()),
    main: html`
      <h1>${t('how-to-use', 'howToUse')()}</h1>

      ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div lang="${content.locale}" dir="${rtlDetect.getLangDir(content.locale)}">
        ${fixHeadingLevels(1, content.html)}
      </div>
    `,
    canonical: Routes.HowToUse,
    current: 'how-to-use',
  })
}
