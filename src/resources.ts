import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from './Context.js'
import { GetPageFromGhost } from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { resourcesMatch } from './routes.js'

export const ResourcesPage = Effect.gen(function* () {
  const getPageFromGhost = yield* GetPageFromGhost
  const locale = yield* Locale

  const content = yield* getPageFromGhost('6526c6ae07fb34a92c7f8d6f')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('resources', 'resources')()),
    main: html`
      <h1>${t('resources', 'resources')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(resourcesMatch.formatter, {}),
    current: 'resources',
  })
}
