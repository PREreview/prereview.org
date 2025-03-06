import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from './Context.js'
import { GetPageFromGhost } from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { trainingsMatch } from './routes.js'

export const TrainingsPage = Effect.gen(function* () {
  const getPageFromGhost = yield* GetPageFromGhost
  const locale = yield* Locale

  const content = yield* getPageFromGhost('64639b5007fb34a92c7f8518')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
  return PageResponse({
    title: plainText`Trainings`,
    main: html`
      <h1>Trainings</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(trainingsMatch.formatter, {}),
    current: 'trainings',
  })
}
