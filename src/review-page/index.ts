import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { type CanWriteFeedbackEnv, canWriteFeedback } from '../feature-flags.js'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import type { User } from '../user.js'
import { failureMessage } from './failure-message.js'
import { type GetFeedbackEnv, getFeedback } from './feedback.js'
import { type GetPrereviewEnv, getPrereview } from './prereview.js'
import { removedMessage } from './removed-message.js'
import { createPage } from './review-page.js'

export type { Feedback, GetFeedbackEnv } from './feedback.js'
export type { GetPrereviewEnv, Prereview } from './prereview.js'

export const reviewPage = ({
  id,
  locale,
  user,
}: {
  id: number
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<CanWriteFeedbackEnv & GetPrereviewEnv & GetFeedbackEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
    RTE.bindW('feedback', ({ review }) => getFeedback(review.doi)),
    RTE.apSW('canWriteFeedback', user ? RTE.fromReader(canWriteFeedback(user)) : RTE.of(false)),
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
