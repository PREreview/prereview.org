import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../src/routes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewStart', () => {
  describe('when there is a session', () => {
    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.form(), fc.user(), fc.supportedLocale(), fc.boolean()])(
      'there is a form',
      async (preprintId, preprint, newReview, user, locale, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

        const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
          formStore,
          getPreprint: () => TE.right(preprint),
          mustDeclareUseOfAi,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
          status: Status.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.user(), fc.supportedLocale(), fc.boolean()])(
      "there isn't a form",
      async (preprintId, preprint, user, locale, mustDeclareUseOfAi) => {
        const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
          formStore: new Keyv(),
          getPreprint: () => TE.right(preprint),
          mustDeclareUseOfAi,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
      fc.supportedLocale(),
      fc.option(fc.form(), { nil: undefined }),
      fc.boolean(),
    ])('the user is an author', async (preprintId, [user, preprint], locale, newReview, mustDeclareUseOfAi) => {
      const formStore = new Keyv()
      if (newReview) {
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
      }

      const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
        formStore,
        getPreprint: () => TE.right(preprint),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
        status: Status.Forbidden,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprint, locale, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewStart({ id: preprintId, locale, user: undefined })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when the preprint cannot be loaded', async (preprintId, user, locale, mustDeclareUseOfAi) => {
    const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprint: () => TE.left(new PreprintIsUnavailable({})),
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when the preprint is not found', async (preprintId, user, locale, mustDeclareUseOfAi) => {
    const actual = await _.writeReviewStart({ id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprint: () => TE.left(new PreprintIsNotFound({})),
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
  })
})
