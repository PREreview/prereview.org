import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { howToUseMatch } from './routes.js'

export const howToUse = pipe(
  getPage('651d895e07fb34a92c7f8d28'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`How to use PREreview`,
    main: html`
      <h1>How to use PREreview</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(howToUseMatch.formatter, {}),
    current: 'how-to-use',
  })
}
