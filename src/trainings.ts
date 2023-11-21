import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { trainingsMatch } from './routes'

export const trainings = pipe(
  getPage('64639b5007fb34a92c7f8518'),
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
