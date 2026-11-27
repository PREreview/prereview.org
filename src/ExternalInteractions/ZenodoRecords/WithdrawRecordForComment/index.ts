import { Array, Data, Effect } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { ZenodoRecordsConfig } from '../ZenodoRecordsConfig.ts'
import { DraftForWithdrawnComment } from './DraftForWithdrawnComment.ts'

export class FailedToWithdrawRecordForComment extends Data.TaggedError('FailedToWithdrawRecordForComment')<{
  cause?: unknown
}> {}

export const WithdrawRecordForComment = Effect.fn('ZenodoRecords.withdrawRecordForComment')(
  function* (recordId: number) {
    const { communityId } = yield* ZenodoRecordsConfig

    const draft = yield* Zenodo.editRecord(recordId)

    if (Array.contains(draft.parent.communities.ids ?? [], communityId)) {
      yield* Zenodo.removeRecordFromCommunity({ recordId, communityId })
    }

    const updatedDraft = yield* Zenodo.updateDraft(DraftForWithdrawnComment(draft))

    yield* Zenodo.publishDraft(updatedDraft)
  },
  Effect.catch(error => new FailedToWithdrawRecordForComment({ cause: error })),
)
