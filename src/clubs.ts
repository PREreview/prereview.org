import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { clubsMatch } from './routes.js'

export const clubs = pipe(
  getPageFromGhost('64637b4c07fb34a92c7f84ec'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Clubs`,
    main: html`
      <h1>Clubs</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(clubsMatch.formatter, {}),
    current: 'clubs',
  })
}
