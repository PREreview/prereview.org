import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error.js'
import type { PageResponse } from '../response.js'
import { failureMessage } from './failure-message.js'
import { type GetPrereviewEnv, getPrereview } from './prereview.js'
import { removedMessage } from './removed-message.js'
import { createPage } from './review-page.js'

export type { GetPrereviewEnv, Prereview } from './prereview.js'

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
