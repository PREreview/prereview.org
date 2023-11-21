import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { ediaStatementMatch } from './routes'

export const ediaStatement = pipe(
  getPage('6154aa157741400e8722bb17'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Equity, Diversity, Inclusion, and Accessibility Statement`,
    main: html`
      <h1>Equity, Diversity, Inclusion, and Accessibility Statement</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(ediaStatementMatch.formatter, {}),
    current: 'edia-statement',
  })
}
