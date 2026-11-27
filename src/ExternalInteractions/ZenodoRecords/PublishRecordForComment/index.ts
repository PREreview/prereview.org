import { Array, Data, Effect, Option, pipe } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { ZenodoRecordsConfig } from '../ZenodoRecordsConfig.ts'

export class FailedToPublishRecordForComment extends Data.TaggedError('FailedToPublishRecordForComment')<{
  cause?: unknown
}> {}

export const PublishRecordForComment = Effect.fn('ZenodoRecords.publishRecordForComment')(
  function* (recordId: number) {
    const { communityId } = yield* ZenodoRecordsConfig

    const record = yield* Option.match(yield* Zenodo.getRecord(recordId), {
      onSome: Effect.succeed,
      onNone: () =>
        pipe(
          Zenodo.getDraft(recordId),
          Effect.andThen(Zenodo.publishDraft),
          Effect.andThen(() => Zenodo.getRecord(recordId)),
          Effect.andThen(Effect.fromOption),
        ),
    })

    if (Array.contains(record.parent.communities.ids ?? [], communityId)) {
      return
    }

    yield* Zenodo.addRecordToCommunity({ recordId, communityId })
  },
  Effect.catchTag(
    ['HttpClientError', 'HttpBodyError', 'NoSuchElementError', 'SchemaError'],
    error => new FailedToPublishRecordForComment({ cause: error }),
  ),
)
