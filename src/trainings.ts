import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { GetPageFromGhost } from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { PageResponse } from './response.js'
import { trainingsMatch } from './routes.js'

export const TrainingsPage = Effect.gen(function* () {
  const getPageFromGhost = yield* GetPageFromGhost

  const content = yield* getPageFromGhost('64639b5007fb34a92c7f8518')

  return createPage(content)
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage(content: Html) {
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
