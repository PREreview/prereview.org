import { Data, Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.js'

export class FailedToPublishRecord extends Data.TaggedError('FailedToPublishRecord')<{
  cause?: unknown
}> {}

export const PublishRecord = Effect.fn(
  function* (recordId: number) {
    const deposition = yield* Zenodo.getDeposition(recordId)

    yield* Zenodo.publishDeposition(deposition)
  },
  Effect.catchAll(error => new FailedToPublishRecord({ cause: error })),
)
