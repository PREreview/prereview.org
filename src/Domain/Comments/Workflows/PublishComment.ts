import { Effect } from 'effect'
import { Temporal, type Uuid } from '../../../types/index.ts'
import { MarkCommentAsPublished } from '../Commands.ts'
import { HandleCommentCommand, PublishCommentOnZenodo } from '../Context.ts'
import * as Errors from '../Errors.ts'

export const PublishOnZenodo = Effect.fn('Comments.publishOnZenodo')(function* (id: number) {
  const publishCommentOnZenodo = yield* PublishCommentOnZenodo

  yield* publishCommentOnZenodo(id)

  return yield* Temporal.currentInstant
})

export const RecordPublication = Effect.fn('Comments.recordPublication')(
  function* (commentId: Uuid.Uuid, publishedAt: Temporal.Instant) {
    const handleCommand = yield* HandleCommentCommand

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
