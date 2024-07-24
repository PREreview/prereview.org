import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { translate } from './locales/index.js'
import { PageResponse } from './response.js'
import { aboutUsMatch } from './routes.js'

export const aboutUs = pipe(
  getPage('6154aa157741400e8722bb14'),
  RTE.matchW(() => havingProblemsPage, createPage),
)

function createPage(content: Html) {
  return PageResponse({
    title: plainText(translate('en-US', 'about-us', 'title')),
    main: html`
      <h1>${translate('en-US', 'about-us', 'title')}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(aboutUsMatch.formatter, {}),
    current: 'about-us',
  })
}
