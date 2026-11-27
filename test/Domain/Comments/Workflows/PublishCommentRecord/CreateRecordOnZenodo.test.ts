import { Effect, Layer, Option, pipe, Result } from 'effect'
import * as Comments from '../../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../../src/Domain/Comments/Workflows/PublishCommentRecord/CreateRecordOnZenodo.ts'
import { ZenodoRecords } from '../../../../../src/ExternalInteractions/index.ts'
import { html } from '../../../../../src/html.ts'
import { Doi } from '../../../../../src/types/Doi.ts'
import { Uuid } from '../../../../../src/types/index.ts'
import * as fc from '../../../../fc.ts'
import { describe, expect, it, vi } from '../../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
const doi = Doi('10.5072/zenodo.107286')
const id = 107286

describe('CreateRecordOnZenodo', () => {
  it.effect.prop('creates a record', [fc.persona(), fc.prereview()], ([author, prereview]) =>
    Effect.gen(function* () {
      const data: Comments.DataForZenodoRecord = {
        author,
        comment: html`<p>Some comment.</p>`,
        competingInterests: Option.none(),
        language: Option.none(),
        prereview: {
          doi: prereview.doi,
          url: new URL('http://example.com/reviews/123'),
          preprint: { id: prereview.preprint.id, title: prereview.preprint.title },
        },
      }
      const getDataForZenodoRecord = vi.fn<(typeof Comments.Comments.Service)['getDataForZenodoRecord']>(() =>
        Effect.succeed(data),
      )
      const createRecordForComment = vi.fn<(typeof ZenodoRecords.ZenodoRecords.Service)['createRecordForComment']>(() =>
        Effect.succeed({ recordId: id, doi }),
      )

      const actual = yield* pipe(
        _.CreateRecordOnZenodo(commentId),
        Effect.result,
        Effect.provide([
          Layer.mock(Comments.Comments, { getDataForZenodoRecord }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { createRecordForComment }),
        ]),
      )

      expect(actual).toStrictEqual(Result.succeed({ recordId: id, doi }))
      expect(getDataForZenodoRecord).toHaveBeenCalledWith(commentId)
      expect(createRecordForComment).toHaveBeenCalledWith(data)
    }),
  )

  it.effect.each([
    ['not started', new Comments.CommentHasNotBeenStarted()],
    ['incomplete', new Comments.CommentIsIncomplete()],
    ['already published', new Comments.CommentWasAlreadyPublished()],
    ['withdrawn', new Comments.CommentHasBeenWithdrawn()],
    ['unavailable', new Comments.DataForZenodoRecordIsUnavailable({})],
  ] as const)("when the comment's data can't be found (%s)", ([, error]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.CreateRecordOnZenodo(commentId),
        Effect.result,
        Effect.provide([
          Layer.mock(Comments.Comments, { getDataForZenodoRecord: () => Effect.fail(error) }),
          Layer.mock(ZenodoRecords.ZenodoRecords, {}),
        ]),
      )

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToPublishComment({ cause: error })))
    }),
  )

  it.effect.prop("when a record can't be created", [fc.persona(), fc.prereview()], ([author, prereview]) =>
    Effect.gen(function* () {
      const error = new ZenodoRecords.FailedToCreateRecordForComment({})

      const actual = yield* pipe(
        _.CreateRecordOnZenodo(commentId),
        Effect.result,
        Effect.provide([
          Layer.mock(Comments.Comments, {
            getDataForZenodoRecord: () =>
              Effect.succeed({
                author,
                comment: html`<p>Some comment.</p>`,
                competingInterests: Option.none(),
                language: Option.none(),
                prereview: {
                  doi: prereview.doi,
                  url: new URL('http://example.com/reviews/123'),
                  preprint: { id: prereview.preprint.id, title: prereview.preprint.title },
                },
              }),
          }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { createRecordForComment: () => Effect.fail(error) }),
        ]),
      )

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToPublishComment({ cause: error })))
    }),
  )
})
