import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../../locales/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { pageNotFound } from '../http-error.ts'
import { type GetCommentsEnv, getComments } from './comments.ts'
import { failureMessage } from './failure-message.ts'
import { type GetPrereviewEnv, getPrereview } from './prereview.ts'
import { removedMessage } from './removed-message.ts'
import { createPage } from './review-page.ts'

export type { Prereview } from '../../Prereviews/index.ts'
export { CommentsForReview, UnableToInvalidateComments, type Comment, type GetCommentsEnv } from './comments.ts'
export type { GetPrereviewEnv } from './prereview.ts'

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
