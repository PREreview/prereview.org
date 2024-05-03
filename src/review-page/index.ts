import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import { failureMessage } from './failure-message'
import { type GetPrereviewEnv, getPrereview } from './prereview'
import { removedMessage } from './removed-message'
import { createPage } from './review-page'

export { GetPrereviewEnv, Prereview } from './prereview'

export const reviewPage = (id: number): RT.ReaderTask<GetPrereviewEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('review', getPrereview(id)),
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
