import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewStartMatch } from '../../src/routes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.form(), fc.user()])(
      'there is a form already',
      async (preprintId, preprint, newReview, user) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

        const actual = await _.writeReview({ id: preprintId, user })({
          formStore,
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
        })
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.user()])(
      "there isn't a form",
      async (preprintId, preprint, user) => {
        const actual = await _.writeReview({ id: preprintId, user })({
          formStore: new Keyv(),
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
          status: Status.OK,
          title: expect.stringContaining('Write'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('Write'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
    ])('the user is an author', async (preprintId, [user, preprint]) => {
      const actual = await _.writeReview({ id: preprintId, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
        status: Status.Forbidden,
        title: expect.stringContaining('own preprint'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('own preprint'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprint()])(
    "when there isn't a session",
    async (preprintId, preprint) => {
      const actual = await _.writeReview({ id: preprintId, user: undefined })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
        status: Status.OK,
        title: expect.stringContaining('Write'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('Write'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined })])(
    'when the preprint cannot be loaded',
    async (preprintId, user) => {
      const actual = await _.writeReview({ id: preprintId, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined })])(
    'when the preprint is not found',
    async (preprintId, user) => {
      const actual = await _.writeReview({ id: preprintId, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.left('not-found'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
