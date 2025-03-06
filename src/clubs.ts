import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { clubsMatch } from './routes.js'

export const clubs = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('64637b4c07fb34a92c7f84ec')),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
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
