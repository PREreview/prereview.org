import type { Effect } from 'effect'
import type * as ReviewPage from '../review-page/index.js'
import type { CommentWithoutText } from './TransformRecordToCommentWithoutText.js'

export declare const addCommentText: (commentWithoutText: CommentWithoutText) => Effect.Effect<ReviewPage.Comment>
