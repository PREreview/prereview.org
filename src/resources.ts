import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { resourcesMatch } from './routes.js'

export const resources = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('6526c6ae07fb34a92c7f8d6f')),

    RTE.matchW(() => havingProblemsPage(locale), createPage),
  )

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('resources', 'resources')()),
    main: html`
      <h1>${t('resources', 'resources')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(resourcesMatch.formatter, {}),
    current: 'resources',
  })
}
