import { Context, Effect } from 'effect'
import { Locale } from '../Context.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { type Html, fixHeadingLevels, html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as Routes from '../routes.js'

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, 'unavailable' | 'not-found'>
>() {}

export const AboutUsPage = Effect.gen(function* () {
  const locale = yield* Locale
  const getPageFromGhost = yield* GetPageFromGhost

  const content = yield* getPageFromGhost('6154aa157741400e8722bb14')

  return createPage({ content, locale })
}).pipe(Effect.catchAll(() => HavingProblemsPage))

function createPage({ content, locale }: { content: Html; locale: SupportedLocale }) {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('about-us', 'title')()),
    main: html`
      <h1>${t('about-us', 'title')()}</h1>

      ${fixHeadingLevels(1, content)}
    `,
    canonical: Routes.AboutUs,
    current: 'about-us',
  })
}
