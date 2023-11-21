import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { peopleMatch } from './routes'

export const people = pipe(
  getPage('6154aa157741400e8722bb0a'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`People`,
    main: html`
      <h1>People</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(peopleMatch.formatter, {}),
    current: 'people',
  })
}
