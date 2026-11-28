import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Zenodo as ZenodoApi } from '../../ExternalApis/index.ts'
import { CreateRecordForComment } from './CreateRecordForComment/index.ts'
import { CreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'
import { GetDoiForDatasetReviewRecord } from './GetDoiForDatasetReviewRecord/index.ts'
import { PublishRecord } from './PublishRecord/index.ts'
import { PublishRecordForComment } from './PublishRecordForComment/index.ts'
import { WithdrawRecordForComment } from './WithdrawRecordForComment/index.ts'
import type { ZenodoRecordsConfig } from './ZenodoRecordsConfig.ts'

export * from './legacy-zenodo.ts'

export { FailedToCreateRecordForComment, type Comment } from './CreateRecordForComment/index.ts'

export { FailedToCreateRecordForDatasetReview } from './CreateRecordForDatasetReview/index.ts'

export { FailedToGetRecordForDatasetReview } from './GetDoiForDatasetReviewRecord/index.ts'

export { FailedToPublishRecord } from './PublishRecord/index.ts'

export { FailedToPublishRecordForComment } from './PublishRecordForComment/index.ts'

export { FailedToWithdrawRecordForComment } from './WithdrawRecordForComment/index.ts'

export { ZenodoRecordsConfig } from './ZenodoRecordsConfig.ts'

export class ZenodoRecords extends Context.Service<
  ZenodoRecords,
  {
    createRecordForComment: (
      ...args: Parameters<typeof CreateRecordForComment>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof CreateRecordForComment>>,
      Effect.Error<ReturnType<typeof CreateRecordForComment>>
    >
    /** @deprecated Uses Zenodo's legacy deposit API. */
    createRecordForDatasetReview: (
      ...args: Parameters<typeof CreateRecordForDatasetReview>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof CreateRecordForDatasetReview>>,
      Effect.Error<ReturnType<typeof CreateRecordForDatasetReview>>
    >
    /** @deprecated Uses Zenodo's legacy deposit API. */
    getDoiForDatasetReviewRecord: (
      ...args: Parameters<typeof GetDoiForDatasetReviewRecord>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetDoiForDatasetReviewRecord>>,
      Effect.Error<ReturnType<typeof GetDoiForDatasetReviewRecord>>
    >
    /** @deprecated Uses Zenodo's legacy deposit API. */
    publishRecord: (
      ...args: Parameters<typeof PublishRecord>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof PublishRecord>>, Effect.Error<ReturnType<typeof PublishRecord>>>
    publishRecordForComment: (
      ...args: Parameters<typeof PublishRecordForComment>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof PublishRecordForComment>>,
      Effect.Error<ReturnType<typeof PublishRecordForComment>>
    >
    withdrawRecordForComment: (
      ...args: Parameters<typeof WithdrawRecordForComment>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof WithdrawRecordForComment>>,
      Effect.Error<ReturnType<typeof WithdrawRecordForComment>>
    >
  }
>()('ZenodoRecords') {}

export const createRecordForComment = (...args: Parameters<(typeof ZenodoRecords.Service)['createRecordForComment']>) =>
  ZenodoRecords.use(service => service.createRecordForComment(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const createRecordForDatasetReview = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['createRecordForDatasetReview']>
) => ZenodoRecords.use(service => service.createRecordForDatasetReview(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const getDoiForDatasetReviewRecord = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['getDoiForDatasetReviewRecord']>
) => ZenodoRecords.use(service => service.getDoiForDatasetReviewRecord(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const publishRecord = (...args: Parameters<(typeof ZenodoRecords.Service)['publishRecord']>) =>
  ZenodoRecords.use(service => service.publishRecord(...args))

export const publishRecordForComment = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['publishRecordForComment']>
) => ZenodoRecords.use(service => service.publishRecordForComment(...args))

export const withdrawRecordForComment = (
  ...args: Parameters<(typeof ZenodoRecords.Service)['withdrawRecordForComment']>
) => ZenodoRecords.use(service => service.withdrawRecordForComment(...args))

export const make: Effect.Effect<typeof ZenodoRecords.Service, never, ZenodoApi.Zenodo | ZenodoRecordsConfig> =
  Effect.gen(function* () {
    const context = yield* Effect.map(
      Effect.context<ZenodoApi.Zenodo | ZenodoRecordsConfig>(),
      Context.omit(Scope.Scope),
    )

    return {
      createRecordForComment: flow(CreateRecordForComment, Effect.provide(context)),
      createRecordForDatasetReview: flow(CreateRecordForDatasetReview, Effect.provide(context)),
      getDoiForDatasetReviewRecord: flow(GetDoiForDatasetReviewRecord, Effect.provide(context)),
      publishRecord: flow(PublishRecord, Effect.provide(context)),
      publishRecordForComment: flow(PublishRecordForComment, Effect.provide(context)),
      withdrawRecordForComment: flow(WithdrawRecordForComment, Effect.provide(context)),
    }
  })

export const layer = Layer.effect(ZenodoRecords, make)
