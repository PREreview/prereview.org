import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch } from '../../src/routes.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewUseOfAi', () => {
  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user()])(
    'when there is a session',
    async (preprintId, preprintTitle, user) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, user })({
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi: true,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user()])(
    'when the feature flag is turned off',
    async (preprintId, preprintTitle, user) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, user })({
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi: false,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, user: undefined })({
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.boolean()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, user })({
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.boolean()])(
    'when the preprint is not found',
    async (preprintId, user, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, user })({
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
