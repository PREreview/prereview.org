import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { trainingsMatch } from './routes.js'

export const trainings = pipe(
  getPageFromGhost('64639b5007fb34a92c7f8518'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

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
