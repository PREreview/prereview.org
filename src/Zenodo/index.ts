import type { HttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Array, Effect, pipe } from 'effect'
import * as CachingHttpClient from '../CachingHttpClient/index.js'
import * as ReviewPage from '../review-page/index.js'
import { addCommentText } from './AddCommentText.js'
import { getCommunityRecords, type ZenodoOrigin } from './CommunityRecords.js'
import { constructCommentListUrl } from './ConstructCommentListUrl.js'
import { constructUrlsToInvalidatePrereview } from './ConstructUrlsToInvalidatePrereview.js'
import { getDoiForPrereview } from './GetDoiForPrereview.js'
import { transformRecordToCommentWithoutText } from './TransformRecordToCommentWithoutText.js'

export { ZenodoOrigin } from './CommunityRecords.js'

export const getCommentsForPrereviewFromZenodo = (
  id: Doi.Doi,
): Effect.Effect<ReadonlyArray<ReviewPage.Comment>, 'unavailable', HttpClient.HttpClient | ZenodoOrigin> =>
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

export const invalidatePrereviewInCache = (
  prereviewId: number,
): Effect.Effect<void, never, HttpClient.HttpClient | ZenodoOrigin | CachingHttpClient.HttpCache> =>
  pipe(
    getDoiForPrereview(prereviewId),
    Effect.andThen(constructUrlsToInvalidatePrereview),
    Effect.andThen(Array.map(invalidateCacheEntry)),
    Effect.andThen(Effect.allWith({ mode: 'either', concurrency: 'unbounded' })),
    Effect.asVoid,
    Effect.catchAll(error =>
      Effect.logError('Unable to invalidate PREreview in cache').pipe(Effect.annotateLogs({ error, prereviewId })),
    ),
  )

export const invalidateCommentsForPrereview = (
  prereviewId: number,
): Effect.Effect<
  void,
  ReviewPage.UnableToInvalidateComments,
  CachingHttpClient.HttpCache | HttpClient.HttpClient | ZenodoOrigin
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
