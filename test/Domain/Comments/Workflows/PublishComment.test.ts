import { Temporal } from '@js-temporal/polyfill'
import { Effect, pipe, Result } from 'effect'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../src/Domain/Comments/Workflows/PublishComment.ts'
import { Uuid } from '../../../../src/types/index.ts'
import { describe, expect, it, vi } from '../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
const id = 107286
const publishedAt = Temporal.Instant.fromEpochMilliseconds(0)

describe('PublishOnZenodo', () => {
  it.effect('publishes the record', () =>
    Effect.gen(function* () {
      const publishCommentOnZenodo = vi.fn<typeof Comments.PublishCommentOnZenodo.Service>(() => Effect.void)

      const actual = yield* pipe(
        _.PublishOnZenodo(id),
        Effect.provideService(Comments.PublishCommentOnZenodo, publishCommentOnZenodo),
        Effect.result,
      )

      expect(actual).toStrictEqual(Result.succeed(publishedAt))
      expect(publishCommentOnZenodo).toHaveBeenCalledWith(id)
    }),
  )

  it.effect("when the record can't be published", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.PublishOnZenodo(id))

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToPublishComment({})))
    }).pipe(Effect.provideService(Comments.PublishCommentOnZenodo, () => new Comments.UnableToPublishComment({}))),
  )
})

describe('RecordPublication', () => {
  it.effect('records the publication', () =>
    Effect.gen(function* () {
      const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(() => Effect.void)

      const actual = yield* pipe(
        _.RecordPublication(commentId, publishedAt),
        Effect.provideService(Comments.HandleCommentCommand, handleCommentCommand),
        Effect.result,
      )

      expect(actual).toStrictEqual(Result.void)
      expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkCommentAsPublished({ commentId, publishedAt }))
    }),
  )

  it.effect("when the publication can't be recorded", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.RecordPublication(commentId, publishedAt))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToPublishComment({ cause: new Comments.CommentWasAlreadyPublished() })),
      )
    }).pipe(Effect.provideService(Comments.HandleCommentCommand, () => new Comments.CommentWasAlreadyPublished())),
  )
})
