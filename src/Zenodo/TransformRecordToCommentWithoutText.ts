import type { Either } from 'effect'
import type { Record } from 'zenodo-ts'
import type * as ReviewPage from '../review-page/index.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

export declare const transformRecordToCommentWithoutText: (record: Record) => Either.Either<CommentWithoutText>
