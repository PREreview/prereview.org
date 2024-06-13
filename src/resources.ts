import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { resourcesMatch } from './routes.js'

export const resources = pipe(
  getPage('6526c6ae07fb34a92c7f8d6f'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Resources`,
    main: html`
      <h1>Resources</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(resourcesMatch.formatter, {}),
    current: 'resources',
  })
}
