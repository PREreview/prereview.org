import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { codeOfConductMatch } from './routes.js'

export const codeOfConduct = pipe(
  getPage('6154aa157741400e8722bb00'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Code of Conduct`,
    main: html`
      <h1>Code of Conduct</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(codeOfConductMatch.formatter, {}),
    current: 'code-of-conduct',
  })
}
