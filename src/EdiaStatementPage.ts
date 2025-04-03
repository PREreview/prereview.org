import { Effect } from 'effect'
import { Locale } from './Context.js'
import { GetPageFromGhost } from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { DefaultLocale, translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import * as Routes from './routes.js'

export const EdiaStatementPage = Effect.gen(function* () {
  const getPageFromGhost = yield* GetPageFromGhost
  const locale = yield* Locale

  const content = yield* getPageFromGhost('6154aa157741400e8722bb17')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('edia-statement', 'ediaStatement')()),
    main: html`
      <h1>${t('edia-statement', 'ediaStatement')()}</h1>

      ${locale !== DefaultLocale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
      ${fixHeadingLevels(1, content)}
    `,
    canonical: Routes.EdiaStatement,
    current: 'edia-statement',
  })
}
