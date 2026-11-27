import { Effect, Layer, Option, Result } from 'effect'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../src/Domain/Comments/Workflows/WithdrawCommentOnZenodo.ts'
import { Queries } from '../../../../src/Domain/Events/index.ts'
import { ZenodoRecords } from '../../../../src/ExternalInteractions/index.ts'
import { html } from '../../../../src/html.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Uuid } from '../../../../src/types/index.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { describe, expect, it, vi } from '../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')

const published = new Comments.CommentPublished({
  authorId: OrcidId('0000-0002-1825-0097'),
  competingInterests: Option.none(),
  doi: Doi('10.5072/zenodo.107286'),
  id: 107286,
  comment: html`<p>Some comment.</p>`,
  persona: 'public',
  prereviewId: 123,
})

describe('WithdrawOnZenodo', () => {
  it.effect('withdraws the record', () =>
    Effect.gen(function* () {
      const withdrawRecordForComment = vi.fn<typeof ZenodoRecords.ZenodoRecords.Service.withdrawRecordForComment>(
        () => Effect.void,
      )

      const actual = yield* Effect.result(_.WithdrawOnZenodo(commentId)).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(published)),
          Layer.mock(ZenodoRecords.ZenodoRecords, { withdrawRecordForComment }),
        ]),
      )

      expect(actual).toStrictEqual(Result.void)
      expect(withdrawRecordForComment).toHaveBeenCalledWith(published.id)
    }),
  )

  it.effect.each<[string, Comments.CommentState]>([
    ['not started', new Comments.CommentNotStarted()],
    [
      'in progress',
      new Comments.CommentInProgress({ authorId: published.authorId, prereviewId: published.prereviewId }),
    ],
  ])("when the comment hasn't been published (%s)", ([, comment]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.WithdrawOnZenodo(commentId)).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(comment)),
          Layer.mock(ZenodoRecords.ZenodoRecords, {}),
        ]),
      )

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToWithdrawCommentOnZenodo({ cause: new Comments.CommentHasNotBeenPublished() })),
      )
    }),
  )

  it.effect("when the comment can't be read", () =>
    Effect.gen(function* () {
      const error = new Queries.UnableToQuery({})

      const actual = yield* Effect.result(_.WithdrawOnZenodo(commentId)).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.fail(error)),
          Layer.mock(ZenodoRecords.ZenodoRecords, {}),
        ]),
      )

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToWithdrawCommentOnZenodo({ cause: error })))
    }),
  )

  it.effect("when the record can't be withdrawn", () =>
    Effect.gen(function* () {
      const error = new ZenodoRecords.FailedToWithdrawRecordForComment({})

      const actual = yield* Effect.result(_.WithdrawOnZenodo(commentId)).pipe(
        Effect.provide([
          Layer.succeed(Comments.GetComment, () => Effect.succeed(published)),
          Layer.mock(ZenodoRecords.ZenodoRecords, { withdrawRecordForComment: () => Effect.fail(error) }),
        ]),
      )

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToWithdrawCommentOnZenodo({ cause: error })))
    }),
  )
})
