import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from './Context.js'
import * as GhostPage from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { DefaultLocale, translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import * as Routes from './routes.js'

export const PeoplePage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('6154aa157741400e8722bb0a')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('people', 'people')()),
    main: html`
      <h1>${t('people', 'people')()}</h1>

      ${locale !== DefaultLocale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div lang="${DefaultLocale}" dir="${rtlDetect.getLangDir(locale)}">${fixHeadingLevels(1, content)}</div>
    `,
    canonical: Routes.People,
    current: 'people',
  })
}
