import { Array, Context, Effect, flow, Layer, pipe, Scope } from 'effect'
import * as CachingHttpClient from '../../CachingHttpClient/index.ts'
import type { Zenodo as ZenodoApi } from '../../ExternalApis/index.ts'
import type { PreprintId } from '../../Domain/Preprints/index.ts'
import type { PublicUrl } from '../../public-url.ts'
import type { OrcidId, Pseudonym } from '../../types/index.ts'
import { constructUrlsToInvalidatePrereview } from './ConstructUrlsToInvalidatePrereview.ts'
import { CreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'
import { GetDoiForDatasetReviewRecord } from './GetDoiForDatasetReviewRecord/index.ts'
import { PublishRecord } from './PublishRecord/index.ts'

export * from './legacy-zenodo.ts'

export { FailedToCreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'

export { FailedToGetRecordForDatasetReview } from './GetDoiForDatasetReviewRecord/index.ts'

export { FailedToPublishRecord } from './PublishRecord/index.ts'

export class ZenodoRecords extends Context.Service<
  ZenodoRecords,
  {
    createRecordForDatasetReview: (
      ...args: Parameters<typeof CreateRecordForDatasetReview>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof CreateRecordForDatasetReview>>,
      Effect.Error<ReturnType<typeof CreateRecordForDatasetReview>>
    >
    getDoiForDatasetReviewRecord: (
      ...args: Parameters<typeof GetDoiForDatasetReviewRecord>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetDoiForDatasetReviewRecord>>,
      Effect.Error<ReturnType<typeof GetDoiForDatasetReviewRecord>>
    >
    publishRecord: (
      ...args: Parameters<typeof PublishRecord>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof PublishRecord>>, Effect.Error<ReturnType<typeof PublishRecord>>>
  }
>()('ZenodoRecords') {}

export const createRecordForDatasetReview = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['createRecordForDatasetReview']>
) => ZenodoRecords.use(service => service.createRecordForDatasetReview(...args))

export const getDoiForDatasetReviewRecord = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['getDoiForDatasetReviewRecord']>
) => ZenodoRecords.use(service => service.getDoiForDatasetReviewRecord(...args))

export const publishRecord = (...args: Parameters<(typeof ZenodoRecords.Service)['publishRecord']>) =>
  ZenodoRecords.use(service => service.publishRecord(...args))

export const make: Effect.Effect<typeof ZenodoRecords.Service, never, ZenodoApi.Zenodo> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<ZenodoApi.Zenodo>(), Context.omit(Scope.Scope))

  return {
    createRecordForDatasetReview: flow(CreateRecordForDatasetReview, Effect.provide(context)),
    getDoiForDatasetReviewRecord: flow(GetDoiForDatasetReviewRecord, Effect.provide(context)),
    publishRecord: flow(PublishRecord, Effect.provide(context)),
  }
})

export const layer = Layer.effect(ZenodoRecords, make)

export const invalidatePrereviewInCache = ({
  prereviewId,
  preprintId,
  user,
}: {
  prereviewId: number
  preprintId?: PreprintId
  user: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym }
}): Effect.Effect<void, never, ZenodoApi.ZenodoApi | PublicUrl | CachingHttpClient.HttpCache> =>
  pipe(
    constructUrlsToInvalidatePrereview({ prereviewId, preprintId, user }),
    Effect.map(Array.map(invalidateCacheEntry)),
    Effect.andThen(effects => Effect.all(effects, { mode: 'result', concurrency: 'unbounded' })),
    Effect.map(Array.getFailures),
    Effect.andThen(
      Effect.forEach(error =>
        Effect.logError('Unable to invalidate URL for PREreview').pipe(Effect.annotateLogs({ error, prereviewId })),
      ),
    ),
    Effect.catch(error =>
      Effect.logError('Unable to invalidate PREreview in cache').pipe(Effect.annotateLogs({ error, prereviewId })),
    ),
  )

const invalidateCacheEntry = Effect.fnUntraced(function* (url: URL) {
  const httpCache = yield* CachingHttpClient.HttpCache

  yield* httpCache.delete(url)
})
