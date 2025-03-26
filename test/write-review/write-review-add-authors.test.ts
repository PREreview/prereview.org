import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { type GetPreprintTitleEnv, PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewAddAuthorMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewAddAuthors', () => {
  describe("when there aren't more authors to add", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.supportedLocale(),
      fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) }),
      fc.boolean(),
    ])('when the form is completed', async (preprintId, preprintTitle, user, locale, newReview, mustDeclareUseOfAi) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAddAuthors({
        id: preprintId,
        locale,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
      fc.boolean(),
    ])(
      'when the form is incomplete',
      async (preprintId, preprintTitle, user, locale, newReview, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await _.writeReviewAddAuthors({
          id: preprintId,
          locale,
          method: 'POST',
          user,
        })({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          mustDeclareUseOfAi,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      },
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.form({ moreAuthors: fc.constantFrom('yes'), otherAuthors: fc.constantFrom([], undefined) }),
    fc.boolean(),
  ])(
    'when there are no authors',
    async (preprintId, preprintTitle, method, user, locale, newReview, mustDeclareUseOfAi) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewAddAuthorMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when there is no form', async (preprintId, preprintTitle, method, user, locale, mustDeclareUseOfAi) => {
    const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
      mustDeclareUseOfAi,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    fc.boolean(),
  ])(
    'when there are no more authors',
    async (preprintId, preprintTitle, method, user, locale, newReview, mustDeclareUseOfAi) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
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

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean()])(
    'when the preprint cannot be loaded',
    async (preprintId, method, user, locale, mustDeclareUseOfAi) => {
      const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
        TE.left(new PreprintIsUnavailable({})),
      )

      const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
        formStore: new Keyv(),
        getPreprintTitle,
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
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean()])(
    'when the preprint cannot be found',
    async (preprintId, method, user, locale, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
        formStore: new Keyv(),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, method, locale, mustDeclareUseOfAi) => {
      const actual = await _.writeReviewAddAuthors({ id: preprintId, locale, method })({
        formStore: new Keyv(),
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
})
