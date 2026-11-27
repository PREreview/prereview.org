import { Data, Effect, Exit } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { Temporal } from '../../../types/index.ts'
import { CommentToZenodoRecord, type Comment } from './CommentToZenodoRecord.ts'

export type { Comment } from './CommentToZenodoRecord.ts'

export class FailedToCreateRecordForComment extends Data.TaggedError('FailedToCreateRecordForComment')<{
  cause?: unknown
}> {}

export const CreateRecordForComment = Effect.fn('ZenodoRecords.createRecordForComment')(
  function* (comment: Omit<Comment, 'publicationDate'>) {
    const publicationDate = yield* Temporal.currentPlainDate

    const record = CommentToZenodoRecord({ ...comment, publicationDate })

    return yield* Effect.acquireUseRelease(
      Zenodo.createDraft(record.draft),
      Effect.fnUntraced(function* (draft) {
        const doi = yield* Zenodo.reserveDoi(draft)

        yield* Zenodo.startDraftFileUpload({ draft, key: record.file.name })
        yield* Zenodo.uploadDraftFileContent({ draft, file: record.file })
        yield* Zenodo.commitDraftFile({ draft, key: record.file.name })

        return { recordId: draft.id, doi }
      }),
      (draft, exit) =>
        Exit.match(exit, {
          onSuccess: () => Effect.void,
          onFailure: () =>
            Effect.ignore(Zenodo.deleteDraft(draft), { log: 'Warn', message: 'Unable to delete draft for comment' }),
        }),
    )
  },
  Effect.catchTag(
    ['HttpClientError', 'HttpBodyError', 'SchemaError'],
    error => new FailedToCreateRecordForComment({ cause: error }),
  ),
)
