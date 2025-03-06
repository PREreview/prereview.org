import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { howToUseMatch } from './routes.js'

export const howToUse = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('651d895e07fb34a92c7f8d28')),
    RTE.matchW(() => havingProblemsPage(locale), createPage),
  )

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('how-to-use', 'howToUse')()),
    main: html`
      <h1>${t('how-to-use', 'howToUse')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(howToUseMatch.formatter, {}),
    current: 'how-to-use',
  })
}
