import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { clubsMatch } from './routes'

export const clubs = pipe(
  getPage('64637b4c07fb34a92c7f84ec'),
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
