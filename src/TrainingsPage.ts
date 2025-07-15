import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from './Context.js'
import * as GhostPage from './GhostPage/index.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText } from './html.js'
import { DefaultLocale, translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import * as Routes from './routes.js'

export const TrainingsPage = Effect.gen(function* () {
  const locale = yield* Locale

  const content = yield* GhostPage.getPageFromGhost('Trainings')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: GhostPage.GhostPage; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('trainings', 'trainings')()),
    main: html`
      <h1>${t('trainings', 'trainings')()}</h1>

      ${locale !== DefaultLocale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      <div lang="${DefaultLocale}" dir="${rtlDetect.getLangDir(locale)}">${fixHeadingLevels(1, content)}</div>
    `,
    canonical: Routes.Trainings,
    current: 'trainings',
  })
}
