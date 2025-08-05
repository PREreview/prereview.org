import { Data, Effect } from 'effect'
import { GetDeposition } from '../GetDeposition/index.js'
import { PublishDeposition } from '../PublishDeposition/index.js'

export class FailedToPublishRecord extends Data.TaggedError('FailedToPublishRecord')<{
  cause?: unknown
}> {}

export const PublishRecord = Effect.fn(
  function* (recordId: number) {
    const deposition = yield* GetDeposition(recordId)

    yield* PublishDeposition(deposition)
  },
  Effect.catchAll(error => new FailedToPublishRecord({ cause: error })),
)
