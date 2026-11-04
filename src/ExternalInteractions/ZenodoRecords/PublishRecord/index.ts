import { Data, Effect } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'

export class FailedToPublishRecord extends Data.TaggedError('FailedToPublishRecord')<{
  cause?: unknown
}> {}

export const PublishRecord = Effect.fn('ZenodoRecords.publishRecord')(
  function* (recordId: number) {
    const deposition = yield* Zenodo.getDeposition(recordId)

    yield* Zenodo.publishDeposition(deposition)
  },
  Effect.catch(error => new FailedToPublishRecord({ cause: error })),
)
