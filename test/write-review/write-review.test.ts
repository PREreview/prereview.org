import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.js'
import { writeReviewMatch, writeReviewStartMatch } from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.form(), fc.user()])(
      'there is a form already',
      async (preprintId, preprint, locale, newReview, user) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

        const actual = await _.writeReview({ id: preprintId, locale, user })({
          formStore,
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
        })
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.user()])(
      "there isn't a form",
      async (preprintId, preprint, locale, user) => {
        const actual = await _.writeReview({ id: preprintId, locale, user })({
          formStore: new Keyv(),
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.supportedLocale(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
    ])('the user is an author', async (preprintId, locale, [user, preprint]) => {
      const actual = await _.writeReview({ id: preprintId, locale, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
        status: StatusCodes.Forbidden,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprint, locale) => {
      const actual = await _.writeReview({ id: preprintId, locale, user: undefined })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })])(
    'when the preprint cannot be loaded',
    async (preprintId, locale, user) => {
      const actual = await _.writeReview({ id: preprintId, locale, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.left(new PreprintIsUnavailable({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })])(
    'when the preprint is not found',
    async (preprintId, locale, user) => {
      const actual = await _.writeReview({ id: preprintId, locale, user })({
        formStore: new Keyv(),
        getPreprint: () => TE.left(new PreprintIsNotFound({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
