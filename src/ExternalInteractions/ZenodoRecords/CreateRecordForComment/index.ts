import { Data, Effect } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { Temporal } from '../../../types/index.ts'
import { CommentToNewDraft, type Comment } from './CommentToNewDraft.ts'

export type { Comment } from './CommentToNewDraft.ts'

export class FailedToCreateRecordForComment extends Data.TaggedError('FailedToCreateRecordForComment')<{
  cause?: unknown
}> {}

export const CreateRecordForComment = Effect.fn('ZenodoRecords.createRecordForComment')(
  function* (comment: Omit<Comment, 'publicationDate'>) {
    const publicationDate = yield* Temporal.currentPlainDate

    const draft = yield* Zenodo.createDraft(CommentToNewDraft({ ...comment, publicationDate }))

    const doi = yield* Zenodo.reserveDoi(draft)

    const file = { name: 'comment.html', content: comment.comment.toString() }

    yield* Zenodo.startDraftFileUpload({ draft, key: file.name })
    yield* Zenodo.uploadDraftFileContent({ draft, file })
    yield* Zenodo.commitDraftFile({ draft, key: file.name })

    return { recordId: draft.id, doi }
  },
  Effect.catchTag(
    ['HttpClientError', 'HttpBodyError', 'SchemaError'],
    error => new FailedToCreateRecordForComment({ cause: error }),
  ),
)
