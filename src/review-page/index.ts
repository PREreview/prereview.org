import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { type CanWriteCommentsEnv, canWriteComments } from '../feature-flags.js'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import type { User } from '../user.js'
import { type GetCommentsEnv, getComments } from './comments.js'
import { failureMessage } from './failure-message.js'
import { type GetPrereviewEnv, getPrereview } from './prereview.js'
import { removedMessage } from './removed-message.js'
import { createPage } from './review-page.js'

export type { Comment, GetCommentsEnv } from './comments.js'
export type { GetPrereviewEnv, Prereview } from './prereview.js'

export const reviewPage = ({
  id,
  locale,
  user,
}: {
  id: number
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<CanWriteCommentsEnv & GetPrereviewEnv & GetCommentsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
    RTE.bindW('comments', ({ review }) => getComments(review.doi)),
    RTE.apSW('canWriteComments', RTE.fromReader(canWriteComments(user))),
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
