import type { HttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Array, Context, Effect, Layer, pipe } from 'effect'
import * as CachingHttpClient from '../CachingHttpClient/index.js'
import * as ReviewPage from '../review-page/index.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { User } from '../user.js'
import { addCommentText } from './AddCommentText.js'
import { getCommunityRecords } from './CommunityRecords.js'
import { constructCommentListUrl } from './ConstructCommentListUrl.js'
import { constructUrlsToInvalidatePrereview } from './ConstructUrlsToInvalidatePrereview.js'
import { CreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.js'
import { getDoiForPrereview } from './GetDoiForPrereview.js'
import { transformRecordToCommentWithoutText } from './TransformRecordToCommentWithoutText.js'
import type { ZenodoApi } from './ZenodoApi.js'

export { FailedToCreateRecordForDatasetReview, type DatasetReview } from './CreateRecordForDatasetReview/index.js'

export class Zenodo extends Context.Tag('Zenodo')<
  Zenodo,
  {
    createRecordForDatasetReview: typeof CreateRecordForDatasetReview
  }
>() {}

export { ZenodoApi } from './ZenodoApi.js'

export const { createRecordForDatasetReview } = Effect.serviceFunctions(Zenodo)

export const make: Effect.Effect<typeof Zenodo.Service> = Effect.sync(() => ({
  createRecordForDatasetReview: CreateRecordForDatasetReview,
}))

export const layer = Layer.effect(Zenodo, make)

export const getCommentsForPrereviewFromZenodo = (
  id: Doi.Doi,
): Effect.Effect<ReadonlyArray<ReviewPage.Comment>, 'unavailable', HttpClient.HttpClient | ZenodoApi> =>
  pipe(
    constructCommentListUrl(id),
    Effect.andThen(getCommunityRecords),
    Effect.andThen(record => Effect.forEach(record.hits.hits, transformRecordToCommentWithoutText)),
    Effect.andThen(Effect.forEach(addCommentText, { concurrency: 'unbounded' })),
    Effect.catchTags({
      NoTextUrlAvailable: error =>
        Effect.logError('Zenodo record of a comment does not have a text url').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      ParseError: error =>
        Effect.logError('Failed to decode Zenodo response while retrieving a comment').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      RequestError: error =>
        Effect.logError('Unable to retrieve comment text from Zenodo').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      ResponseError: error =>
        Effect.logError('Unable to retrieve comment text from Zenodo').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
    }),
  )

export const invalidatePrereviewInCache = ({
  prereviewId,
  preprintId,
  user,
}: {
  prereviewId: number
  preprintId?: PreprintId
  user: User
}): Effect.Effect<void, never, ZenodoApi | CachingHttpClient.HttpCache> =>
  pipe(
    constructUrlsToInvalidatePrereview({ prereviewId, preprintId, user }),
    Effect.andThen(Array.map(invalidateCacheEntry)),
    Effect.andThen(Effect.allWith({ mode: 'either', concurrency: 'unbounded' })),
    Effect.andThen(Array.getLefts),
    Effect.andThen(
      Effect.forEach(error =>
        Effect.logError('Unable to invalidate URL for PREreview').pipe(Effect.annotateLogs({ error, prereviewId })),
      ),
    ),
    Effect.catchAll(error =>
      Effect.logError('Unable to invalidate PREreview in cache').pipe(Effect.annotateLogs({ error, prereviewId })),
    ),
  )

export const invalidateCommentsForPrereview = (
  prereviewId: number,
): Effect.Effect<
  void,
  ReviewPage.UnableToInvalidateComments,
  CachingHttpClient.HttpCache | HttpClient.HttpClient | ZenodoApi
> =>
  pipe(
    getDoiForPrereview(prereviewId),
    Effect.andThen(constructCommentListUrl),
    Effect.andThen(invalidateCacheEntry),
    Effect.catchTags({
      InternalHttpCacheFailure: error =>
        Effect.logError('Unable to invalidate comments for PREreview').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(new ReviewPage.UnableToInvalidateComments({ cause: error })),
        ),
      ParseError: error =>
        Effect.logError('Failed to decode Zenodo record of a PREreview').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(new ReviewPage.UnableToInvalidateComments({ cause: error })),
        ),
      RequestError: error =>
        Effect.logError('Unable to request a Zenodo record for a PREreview').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(new ReviewPage.UnableToInvalidateComments({ cause: error })),
        ),
      ResponseError: error =>
        Effect.logError('Unable to get Zenodo record for a PREreview').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(new ReviewPage.UnableToInvalidateComments({ cause: error })),
        ),
    }),
  )

const invalidateCacheEntry = Effect.fn(function* (url: URL) {
  const httpCache = yield* CachingHttpClient.HttpCache

  yield* httpCache.delete(url)
})
