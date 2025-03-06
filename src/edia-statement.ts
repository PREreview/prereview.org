import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { ediaStatementMatch } from './routes.js'

export const ediaStatement = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('6154aa157741400e8722bb17')),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
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
