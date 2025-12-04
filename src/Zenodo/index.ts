import type { HttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Array, Context, Effect, flow, Layer, pipe, Scope } from 'effect'
import * as CachingHttpClient from '../CachingHttpClient/index.ts'
import type { Zenodo as ZenodoApi } from '../ExternalApis/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
// eslint-disable-next-line import/no-internal-modules
import * as ReviewPage from '../review-page/comments.ts'
import type { User } from '../user.ts'
import { addCommentText } from './AddCommentText.ts'
import { getCommunityRecords } from './CommunityRecords.ts'
import { constructCommentListUrl } from './ConstructCommentListUrl.ts'
import { constructUrlsToInvalidatePrereview } from './ConstructUrlsToInvalidatePrereview.ts'
import { CreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'
import { GetDoiForDatasetReviewRecord } from './GetDoiForDatasetReviewRecord/index.ts'
import { getDoiForPrereview } from './GetDoiForPrereview.ts'
import { PublishRecord } from './PublishRecord/index.ts'
import { transformRecordToCommentWithoutText } from './TransformRecordToCommentWithoutText.ts'

export { FailedToCreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'

export { FailedToGetRecordForDatasetReview } from './GetDoiForDatasetReviewRecord/index.ts'

export { FailedToPublishRecord } from './PublishRecord/index.ts'

export class Zenodo extends Context.Tag('Zenodo')<
  Zenodo,
  {
    createRecordForDatasetReview: (
      ...args: Parameters<typeof CreateRecordForDatasetReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof CreateRecordForDatasetReview>>,
      Effect.Effect.Error<ReturnType<typeof CreateRecordForDatasetReview>>
    >
    getDoiForDatasetReviewRecord: (
      ...args: Parameters<typeof GetDoiForDatasetReviewRecord>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetDoiForDatasetReviewRecord>>,
      Effect.Effect.Error<ReturnType<typeof GetDoiForDatasetReviewRecord>>
    >
    publishRecord: (
      ...args: Parameters<typeof PublishRecord>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof PublishRecord>>,
      Effect.Effect.Error<ReturnType<typeof PublishRecord>>
    >
  }
>() {}

export const { createRecordForDatasetReview, getDoiForDatasetReviewRecord, publishRecord } =
  Effect.serviceFunctions(Zenodo)

export const make: Effect.Effect<typeof Zenodo.Service, never, ZenodoApi.Zenodo> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<ZenodoApi.Zenodo>(), Context.omit(Scope.Scope))

  return {
    createRecordForDatasetReview: flow(CreateRecordForDatasetReview, Effect.provide(context)),
    getDoiForDatasetReviewRecord: flow(GetDoiForDatasetReviewRecord, Effect.provide(context)),
    publishRecord: flow(PublishRecord, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Zenodo, make)

export const getCommentsForPrereviewFromZenodo = (
  id: Doi.Doi,
): Effect.Effect<ReadonlyArray<ReviewPage.Comment>, 'unavailable', HttpClient.HttpClient | ZenodoApi.ZenodoApi> =>
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
}): Effect.Effect<void, never, ZenodoApi.ZenodoApi | CachingHttpClient.HttpCache> =>
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
  CachingHttpClient.HttpCache | HttpClient.HttpClient | ZenodoApi.ZenodoApi
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
