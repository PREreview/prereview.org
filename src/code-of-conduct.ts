import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { codeOfConductMatch } from './routes.js'

export const codeOfConduct = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('6154aa157741400e8722bb00')),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
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
