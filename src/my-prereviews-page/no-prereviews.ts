import { Array } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { myPrereviewsMatch, reviewAPreprintMatch } from '../routes.js'
import type { Prereview } from './prereviews.js'

export interface NoPrereviews {
  readonly _tag: 'NoPrereviews'
}

export const NoPrereviews: NoPrereviews = {
  _tag: 'NoPrereviews',
}

export const ensureThereArePrereviews: (
  prereviews: ReadonlyArray<Prereview>,
) => E.Either<NoPrereviews, Array.NonEmptyReadonlyArray<Prereview>> = E.fromPredicate(
  Array.isNonEmptyReadonlyArray,
  () => NoPrereviews,
)

export const toResponse: (NoPrereviews: NoPrereviews, locale: SupportedLocale) => PageResponse = (
  noPrereviews,
  locale,
) =>
  PageResponse({
    title: plainText(translate(locale, 'my-prereviews-page', 'myPrereviews')()),
    main: html`
      <h1>${translate(locale, 'my-prereviews-page', 'myPrereviews')()}</h1>

      <div class="inset">
        <p>${translate(locale, 'my-prereviews-page', 'notPublished')()}</p>

        <p>${translate(locale, 'my-prereviews-page', 'appearHere')()}</p>
      </div>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'my-prereviews-page', 'reviewAPreprint')()}</a
      >
    `,
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
  })
