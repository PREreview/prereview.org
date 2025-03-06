import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getPageFromGhost } from './GhostPage.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { havingProblemsPage } from './http-error.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { privacyPolicyMatch } from './routes.js'

export const privacyPolicy = (locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.apS('content', getPageFromGhost('6154aa157741400e8722bb0f')),
    RTE.matchW(() => havingProblemsPage(locale), createPage),
  )

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('privacy-policy', 'privacyPolicy')()),
    main: html`
      <h1>${t('privacy-policy', 'privacyPolicy')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(privacyPolicyMatch.formatter, {}),
    current: 'privacy-policy',
  })
}
