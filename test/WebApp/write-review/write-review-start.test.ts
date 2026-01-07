import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewStart', () => {
  describe('when there is a session', () => {
    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.form(), fc.user(), fc.supportedLocale()])(
      'there is a form',
      async (preprintId, preprint, newReview, user, locale) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

        const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
          formStore,
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.user(), fc.supportedLocale()])(
      "there isn't a form",
      async (preprintId, preprint, user, locale) => {
        const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
          formStore: new Keyv(),
          getPreprint: () => TE.right(preprint),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
      fc.supportedLocale(),
      fc.option(fc.form(), { nil: undefined }),
    ])('the user is an author', async (preprintId, [user, preprint], locale, newReview) => {
      const formStore = new Keyv()
      if (newReview) {
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
      }

      const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
        formStore,
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
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
      const actual = await _.writeReviewStart({ id: preprintId, locale, user: undefined })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the preprint is not found',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
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
