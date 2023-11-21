import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { privacyPolicyMatch } from './routes'

export const privacyPolicy = pipe(
  getPage('6154aa157741400e8722bb0f'),
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
