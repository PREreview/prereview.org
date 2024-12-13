import { FetchHttpClient } from '@effect/platform'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { DeprecatedSleepEnv, Locale } from './Context.js'
import * as FptsToEffect from './FptsToEffect.js'
import { getPage, GhostApi } from './ghost.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { type Html, fixHeadingLevels, html, plainText } from './html.js'
import { type SupportedLocale, translate } from './locales/index.js'
import { PageResponse } from './response.js'
import { aboutUsMatch } from './routes.js'

export const aboutUs = Effect.gen(function* () {
  const locale = yield* Locale
  const fetch = yield* FetchHttpClient.Fetch
  const ghostApi = yield* GhostApi
  const sleep = yield* DeprecatedSleepEnv

  const content = yield* FptsToEffect.readerTaskEither(getPage('6154aa157741400e8722bb14'), {
    fetch,
    ghostApi,
    ...sleep,
  })

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
    canonical: format(aboutUsMatch.formatter, {}),
    current: 'about-us',
  })
}
