import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { liveReviewsMatch } from './routes.js'

export const liveReviews = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('6154aa157741400e8722bb10')),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
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
