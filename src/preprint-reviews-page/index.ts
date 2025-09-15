import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import { type GetPreprintEnv, getPreprint } from '../preprint.js'
import type { IndeterminatePreprintId } from '../Preprints/index.js'
import type { PageResponse, TwoUpPageResponse } from '../response.js'
import { failureMessage } from './failure-message.js'
import { createPage } from './preprint-reviews.js'
import { type GetPrereviewsEnv, getPrereviews } from './prereviews.js'
import { type GetRapidPrereviewsEnv, getRapidPrereviews } from './rapid-prereviews.js'

export type { GetPrereviewsEnv, Prereview } from './prereviews.js'
export type { GetRapidPrereviewsEnv, RapidPrereview } from './rapid-prereviews.js'

export const preprintReviews = ({
  id,
  locale,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
}): RT.ReaderTask<GetPreprintEnv & GetPrereviewsEnv & GetRapidPrereviewsEnv, PageResponse | TwoUpPageResponse> =>
  pipe(
    getPreprint(id),
    RTE.chainW(preprint =>
      pipe(
        RTE.Do,
        RTE.let('preprint', () => preprint),
        RTE.let('locale', () => locale),
        RTE.apS(
          'rapidPrereviews',
          pipe(
            getRapidPrereviews(preprint.id),
            RTE.altW(() => RTE.of([])),
          ),
        ),
        RTE.apSW('reviews', getPrereviews(preprint.id)),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(locale))
          .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => failureMessage(locale))
          .exhaustive(),
      createPage,
    ),
  )
