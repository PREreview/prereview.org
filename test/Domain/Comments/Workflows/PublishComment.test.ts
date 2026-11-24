import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer, pipe, Result } from 'effect'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../src/Domain/Comments/Workflows/PublishComment.ts'
import { Uuid } from '../../../../src/types/index.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'
import { describe, expect, it, vi } from '../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
const id = 107286

describe('PublishComment', () => {
  it.effect('publishes the comment', () =>
    Effect.gen(function* () {
      const publishCommentOnZenodo = vi.fn<typeof Comments.PublishCommentOnZenodo.Service>(() => Effect.void)
      const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(() => Effect.void)

      const actual = yield* pipe(
        _.PublishComment(commentId, id),
        Effect.provide([
          Layer.succeed(Comments.PublishCommentOnZenodo, publishCommentOnZenodo),
          Layer.succeed(Comments.HandleCommentCommand, handleCommentCommand),
        ]),
        Effect.result,
      )

      expect(actual).toStrictEqual(Result.void)
      expect(publishCommentOnZenodo).toHaveBeenCalledWith(id)
      expect(handleCommentCommand).toHaveBeenCalledWith(
        new Comments.MarkCommentAsPublished({ commentId, publishedAt: Temporal.Instant.fromEpochMilliseconds(0) }),
      )
    }),
  )

  it.effect("when the record can't be published", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.PublishComment(commentId, id))

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToPublishComment({})))
    }).pipe(
      Effect.provide([
        Layer.succeed(Comments.PublishCommentOnZenodo, () => new Comments.UnableToPublishComment({})),
        Layer.succeed(Comments.HandleCommentCommand, shouldNotBeCalled),
      ]),
    ),
  )

  it.effect("when the publication can't be recorded", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.PublishComment(commentId, id))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToPublishComment({ cause: new Comments.CommentWasAlreadyPublished() })),
      )
    }).pipe(
      Effect.provide([
        Layer.succeed(Comments.PublishCommentOnZenodo, () => Effect.void),
        Layer.succeed(Comments.HandleCommentCommand, () => new Comments.CommentWasAlreadyPublished()),
      ]),
    ),
  )
})
