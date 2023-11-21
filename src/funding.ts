import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { fundingMatch } from './routes'

export const funding = pipe(
  getPage('6154aa157741400e8722bb12'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`How we’re funded`,
    main: html`
      <h1>How we’re funded</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(fundingMatch.formatter, {}),
    current: 'funding',
  })
}
