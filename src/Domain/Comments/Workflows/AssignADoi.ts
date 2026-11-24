import { Array, Effect, Option, Struct } from 'effect'
import * as EventStore from '../../../EventStore.ts'
import type { Uuid } from '../../../types/index.ts'
import { MarkDoiAsAssigned } from '../Commands.ts'
import { CreateRecordOnZenodoForComment, HandleCommentCommand } from '../Context.ts'
import * as Errors from '../Errors.ts'
import { CommentEventTypes } from '../Events.ts'
import * as Queries from '../Queries.ts'

export const AssignADoi = Effect.fn('Comments.assignADoi')(
  function* (commentId: Uuid.Uuid) {
    const handleCommand = yield* HandleCommentCommand
    const createRecordOnZenodoForComment = yield* CreateRecordOnZenodoForComment

    const events = yield* Effect.map(
      EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
      Option.match({ onNone: Array.empty, onSome: Struct.get('events') }),
    )

    const inputForCommentZenodoRecord = yield* Effect.fromResult(Queries.buildInputForCommentZenodoRecord(events))

    const [doi, id] = yield* createRecordOnZenodoForComment(inputForCommentZenodoRecord)

    yield* handleCommand(new MarkDoiAsAssigned({ commentId, doi, id }))
  },
  Effect.catchTag(
    [
      'FailedToGetEvents',
      'UnexpectedSequenceOfEvents',
      'UnableToHandleCommand',
      'CommentWasAlreadyStarted',
      'CommentHasNotBeenStarted',
      'CommentIsIncomplete',
      'CommentIsBeingPublished',
      'DoiIsNotAssigned',
      'DoiIsAlreadyAssigned',
      'CommentWasAlreadyPublished',
    ],
    error => new Errors.UnableToAssignADoi({ cause: error }),
  ),
)
