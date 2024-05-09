import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RA from 'fp-ts/ReadonlyArray'
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { myPrereviewsMatch, reviewAPreprintMatch } from '../routes'
import type { Prereview } from './prereviews'

export interface NoPrereviews {
  readonly _tag: 'NoPrereviews'
}

export const NoPrereviews: NoPrereviews = {
  _tag: 'NoPrereviews',
}

export const ensureThereArePrereviews: (
  prereviews: ReadonlyArray<Prereview>,
) => E.Either<NoPrereviews, ReadonlyNonEmptyArray<Prereview>> = E.fromPredicate(RA.isNonEmpty, () => NoPrereviews)

export const toResponse: (NoPrereviews: NoPrereviews) => PageResponse = () =>
  PageResponse({
    title: plainText`My PREreviews`,
    main: html`
      <h1>My PREreviews</h1>

      <div class="inset">
        <p>You haven’t published a PREreview yet.</p>

        <p>When you do, it’ll appear here.</p>
      </div>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Review a preprint</a>
    `,
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
  })
