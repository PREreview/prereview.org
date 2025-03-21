import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from './Context.js'
import { GetPageFromGhost } from './GhostPage.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { fixHeadingLevels, html, plainText, type Html } from './html.js'
import { translate, type SupportedLocale } from './locales/index.js'
import { PageResponse } from './response.js'
import { codeOfConductMatch } from './routes.js'

export const CodeOfConductPage = Effect.gen(function* () {
  const getPageFromGhost = yield* GetPageFromGhost
  const locale = yield* Locale

  const content = yield* getPageFromGhost('6154aa157741400e8722bb00')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('code-of-conduct', 'codeOfConduct')()),
    main: html`
      <h1>${t('code-of-conduct', 'codeOfConduct')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: format(codeOfConductMatch.formatter, {}),
    current: 'code-of-conduct',
  })
}
