import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { fundingMatch } from './routes.js'

export const funding = pipe(
  getPageFromGhost('6154aa157741400e8722bb12'),
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
