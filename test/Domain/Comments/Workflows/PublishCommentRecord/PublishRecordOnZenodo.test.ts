import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer, pipe, Result } from 'effect'
import * as Comments from '../../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../../src/Domain/Comments/Workflows/PublishCommentRecord/PublishRecordOnZenodo.ts'
import { ZenodoRecords } from '../../../../../src/ExternalInteractions/index.ts'
import { expect, it, vi } from '../../../../vitest.ts'

const id = 107286
const publishedAt = Temporal.Instant.fromEpochMilliseconds(0)

it.effect('publishes the record', () =>
  Effect.gen(function* () {
    const publishRecordForComment = vi.fn<(typeof ZenodoRecords.ZenodoRecords.Service)['publishRecordForComment']>(
      () => Effect.void,
    )

    const actual = yield* pipe(
      _.PublishRecordOnZenodo(id),
      Effect.result,
      Effect.provide(Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecordForComment })),
    )

    expect(actual).toStrictEqual(Result.succeed(publishedAt))
    expect(publishRecordForComment).toHaveBeenCalledWith(id)
  }),
)

it.effect("when the record can't be published", () =>
  Effect.gen(function* () {
    const error = new ZenodoRecords.FailedToPublishRecordForComment({})

    const actual = yield* pipe(
      _.PublishRecordOnZenodo(id),
      Effect.result,
      Effect.provide(Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecordForComment: () => Effect.fail(error) })),
    )

    expect(actual).toStrictEqual(Result.fail(new Comments.UnableToPublishComment({ cause: error })))
  }),
)
