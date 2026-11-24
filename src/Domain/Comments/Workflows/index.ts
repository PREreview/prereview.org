import { Layer, Struct } from 'effect'
import { Activity, Workflow } from 'effect/workflow'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { AssignADoi as executeAssignCommentADoi } from './AssignADoi.ts'

export const AssignCommentADoi = Workflow.make('AssignCommentADoi', {
  error: Errors.UnableToAssignADoi,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const workflowsLayer = Layer.mergeAll(
  AssignCommentADoi.toLayer(({ commentId }) =>
    Activity.make({
      name: AssignCommentADoi._tag,
      error: AssignCommentADoi.errorSchema,
      execute: executeAssignCommentADoi(commentId),
    }),
  ),
)
