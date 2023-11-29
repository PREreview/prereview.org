import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { resourcesMatch } from './routes'

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
  })
}
