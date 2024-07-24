import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import type { LocaleTranslate } from './locales/index.js'
import { PageResponse } from './response.js'
import { aboutUsMatch } from './routes.js'

export const aboutUs = pipe(
  getPage('6154aa157741400e8722bb14'),
  RTE.matchEW(() => RT.of(havingProblemsPage), RT.fromReaderK(createPage)),
)

function createPage(content: Html) {
  return ({ translate }: { translate: LocaleTranslate }) =>
    PageResponse({
      title: plainText(translate('about-us', 'title')()),
      main: html`
        <h1>${translate('about-us', 'title')()}</h1>

        ${fixHeadingLevels(1, content)}
      `,
      canonical: format(aboutUsMatch.formatter, {}),
      current: 'about-us',
    })
}
