import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import { failureMessage } from './failure-message.js'
import { type GetPrereviewEnv, getPrereview } from './prereview.js'
import { removedMessage } from './removed-message.js'
import { type GetResponsesEnv, getResponses } from './response.js'
import { createPage } from './review-page.js'

export type { GetPrereviewEnv, Prereview } from './prereview.js'
export type { GetResponsesEnv, Response } from './response.js'

export const reviewPage = ({
  id,
  locale,
}: {
  id: number
  locale: SupportedLocale
}): RT.ReaderTask<GetPrereviewEnv & GetResponsesEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
    RTE.bindW('responses', ({ review }) => getResponses(review.doi)),
    RTE.let('locale', () => locale),
    RTE.match(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('removed', () => removedMessage)
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )
