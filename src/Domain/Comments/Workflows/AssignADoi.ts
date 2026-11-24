import { Array, Effect, Option, Struct } from 'effect'
import * as EventStore from '../../../EventStore.ts'
import type { Doi } from '../../../types/Doi.ts'
import type { Uuid } from '../../../types/index.ts'
import { MarkDoiAsAssigned } from '../Commands.ts'
import { CreateRecordOnZenodoForComment, HandleCommentCommand } from '../Context.ts'
import * as Errors from '../Errors.ts'
import { CommentEventTypes } from '../Events.ts'
import * as Queries from '../Queries.ts'

export const CreateRecordOnZenodo = Effect.fn('Comments.createRecordOnZenodo')(
  function* (commentId: Uuid.Uuid) {
    const createRecordOnZenodoForComment = yield* CreateRecordOnZenodoForComment

    const events = yield* Effect.map(
      EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
      Option.match({ onNone: Array.empty, onSome: Struct.get('events') }),
    )

    const inputForCommentZenodoRecord = yield* Effect.fromResult(Queries.buildInputForCommentZenodoRecord(events))

    return yield* createRecordOnZenodoForComment(inputForCommentZenodoRecord)
  },
  Effect.catchTag(
    ['FailedToGetEvents', 'UnexpectedSequenceOfEvents'],
    error => new Errors.UnableToAssignADoi({ cause: error }),
  ),
)

export const RecordAssignedDoi = Effect.fn('Comments.recordAssignedDoi')(
  function* (commentId: Uuid.Uuid, doi: Doi, id: number) {
    const handleCommand = yield* HandleCommentCommand

    yield* handleCommand(new MarkDoiAsAssigned({ commentId, doi, id }))
  },
  Effect.catchTag(
    [
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
