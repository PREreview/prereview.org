import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from '../../Context.ts'
import { GhostPage } from '../../ExternalInteractions/index.ts'
import { fixHeadingLevels, html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageResponse } from '../Response/index.ts'

export const ChampionsProgramPage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('ChampionsProgram')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: GhostPage.GhostPage; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText('Champions Program'),
    main: html`
      <h1>Champions Program</h1>

      ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div lang="${content.locale}" dir="${rtlDetect.getLangDir(content.locale)}">
        ${fixHeadingLevels(1, content.html)}
      </div>
    `,
    canonical: Routes.ChampionsProgram,
    current: 'champions-program',
  })
}
