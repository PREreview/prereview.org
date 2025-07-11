import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import { type GetCommentsEnv, getComments } from './comments.js'
import { failureMessage } from './failure-message.js'
import { type GetPrereviewEnv, getPrereview } from './prereview.js'
import { removedMessage } from './removed-message.js'
import { createPage } from './review-page.js'

export type { Prereview } from '../Prereview.js'
export { CommentsForReview, UnableToInvalidateComments, type Comment, type GetCommentsEnv } from './comments.js'
export type { GetPrereviewEnv } from './prereview.js'

export const reviewPage = ({
  id,
  locale,
}: {
  id: number
  locale: SupportedLocale
}): RT.ReaderTask<GetPrereviewEnv & GetCommentsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
    RTE.bindW('comments', ({ review }) => getComments(review.doi)),
    RTE.let('locale', () => locale),
    RTE.match(
      error =>
        match(error)
          .with('not-found', () => pageNotFound(locale))
          .with('removed', () => removedMessage(locale))
          .with('unavailable', () => failureMessage(locale))
          .exhaustive(),
      createPage,
    ),
  )
