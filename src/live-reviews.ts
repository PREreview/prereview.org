import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { liveReviewsMatch } from './routes.js'

export const liveReviews = pipe(
  getPage('6154aa157741400e8722bb10'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Live Reviews`,
    main: html`
      <h1>Live Reviews</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(liveReviewsMatch.formatter, {}),
    current: 'live-reviews',
  })
}
