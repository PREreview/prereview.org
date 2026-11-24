import { Effect } from 'effect'
import { Temporal, type Uuid } from '../../../types/index.ts'
import { MarkCommentAsPublished } from '../Commands.ts'
import { HandleCommentCommand, PublishCommentOnZenodo } from '../Context.ts'
import * as Errors from '../Errors.ts'

export const PublishComment = Effect.fn('Comments.publishComment')(
  function* (commentId: Uuid.Uuid, id: number) {
    const handleCommand = yield* HandleCommentCommand
    const publishCommentOnZenodo = yield* PublishCommentOnZenodo

    yield* publishCommentOnZenodo(id)

    const publishedAt = yield* Temporal.currentInstant

    yield* handleCommand(new MarkCommentAsPublished({ commentId, publishedAt }))
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
    error => new Errors.UnableToPublishComment({ cause: error }),
  ),
)
