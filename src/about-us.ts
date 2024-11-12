import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { getPage } from './ghost.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { type SupportedLocale, translate } from './locales/index.js'
import { PageResponse } from './response.js'
import { aboutUsMatch } from './routes.js'

export const aboutUs = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.apS('content', getPage('6154aa157741400e8722bb14')),
    RTE.let('locale', () => locale),
    RTE.matchW(() => havingProblemsPage, createPage),
  )

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('about-us', 'title')()),
    main: html`
      <h1>${t('about-us', 'title')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(aboutUsMatch.formatter, {}),
    current: 'about-us',
  })
}
