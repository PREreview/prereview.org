import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { howToUseMatch } from './routes.js'

export const howToUse = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('651d895e07fb34a92c7f8d28')),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content }: { content: Html; locale: SupportedLocale }) {
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
