import { Effect, pipe } from 'effect'
import type { Uuid } from '../../../types/index.ts'
import { ContactEmailAddresses } from '../../ContactEmailAddresses/index.ts'
import { ConfirmExistenceOfVerifiedEmailAddress } from '../Commands.ts'
import { GetComment, HandleCommentCommand } from '../Context.ts'
import * as Errors from '../Errors.ts'

export const CheckIfUserHasAVerifiedEmailAddress = Effect.fn('Comments.checkIfUserHasAVerifiedEmailAddress')(
  function* (commentId: Uuid.Uuid) {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const contactEmailAddresses = yield* ContactEmailAddresses

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentInProgress' || comment.verifiedEmailAddressExists) {
      return
    }

    const userHasAVerifiedEmailAddress = yield* pipe(
      contactEmailAddresses.getContactEmailAddress(comment.authorId),
      Effect.map(emailAddress => emailAddress._tag === 'VerifiedContactEmailAddress'),
      Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(false)),
    )

    if (!userHasAVerifiedEmailAddress) {
      return
    }

    yield* handleCommand(new ConfirmExistenceOfVerifiedEmailAddress({ commentId }))
  },
  Effect.catchTag(
    [
      'UnableToQuery',
      'UnableToHandleCommand',
      'CommentWasAlreadyStarted',
      'CommentHasNotBeenStarted',
      'CommentIsIncomplete',
      'CommentIsBeingPublished',
      'DoiIsNotAssigned',
      'DoiIsAlreadyAssigned',
      'CommentWasAlreadyPublished',
    ],
    error => new Errors.UnableToCheckForAVerifiedEmailAddress({ cause: error }),
  ),
)
