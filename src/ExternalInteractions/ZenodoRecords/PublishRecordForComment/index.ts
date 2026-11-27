import { Array, Data, Effect, Option, pipe } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { ZenodoRecordsConfig } from '../ZenodoRecordsConfig.ts'

export class FailedToPublishRecordForComment extends Data.TaggedError('FailedToPublishRecordForComment')<{
  cause?: unknown
}> {}

export const PublishRecordForComment = Effect.fn('ZenodoRecords.publishRecordForComment')(
  function* (recordId: number) {
    const { communityId } = yield* ZenodoRecordsConfig

    const record = yield* Option.match(yield* getPublishedRecord(recordId), {
      onSome: Effect.succeed,
      onNone: () =>
        pipe(
          Zenodo.getDraft(recordId),
          Effect.andThen(Zenodo.publishDraft),
          Effect.andThen(() => Zenodo.getRecord(recordId)),
        ),
    })

    if (Array.contains(record.parent.communities.ids ?? [], communityId)) {
      return
    }

    yield* Zenodo.addRecordToCommunity({ recordId, communityId })
  },
  Effect.catchTag(
    ['HttpClientError', 'HttpBodyError', 'SchemaError'],
    error => new FailedToPublishRecordForComment({ cause: error }),
  ),
)

const getPublishedRecord = (recordId: number) =>
  pipe(
    Zenodo.getRecord(recordId),
    Effect.map(Option.some),
    Effect.catchTag('HttpClientError', error =>
      error.reason._tag === 'StatusCodeError' && error.reason.response.status === 404
        ? Effect.succeedNone
        : Effect.fail(error),
    ),
  )
