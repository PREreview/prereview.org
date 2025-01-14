import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPageFromGhost } from './GhostPage.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { PageResponse } from './response.js'
import { privacyPolicyMatch } from './routes.js'

export const privacyPolicy = pipe(
  getPageFromGhost('6154aa157741400e8722bb0f'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText`Privacy Policy`,
    main: html`
      <h1>Privacy Policy</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(privacyPolicyMatch.formatter, {}),
    current: 'privacy-policy',
  })
}
