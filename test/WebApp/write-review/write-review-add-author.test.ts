import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Array, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewAddAuthor', () => {
  describe('when multiple authors can be added', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.nonEmptyArray(fc.record({ name: fc.lorem(), emailAddress: fc.emailAddress() })).map(authors =>
        Tuple.make(
          {
            authors: Array.reduce(authors, '', (string, author) => `${string}\n${author.name} ${author.emailAddress}`),
          },
          authors,
        ),
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors() }),
    ])('when the form is completed', async (id, preprintTitle, [body, expected], user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAddAuthor({
        body,
        canAddMultipleAuthors: true,
        id,
        locale,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        otherAuthors: [...newReview.otherAuthors, ...expected],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({
        authors: fc
          .nonEmptyArray(fc.record({ name: fc.lorem(), emailAddress: fc.emailAddress() }))
          .map(Array.reduce('', (string, author) => `${string}\n${author.name} ${author.emailAddress}`)),
      }),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
    ])('when the form is incomplete', async (id, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthor({
        body,
        canAddMultipleAuthors: true,
        id,
        locale,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
    })
  })

  describe("when multiple authors can't be added", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.supportedLocale(),
      fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors() }),
    ])('when the form is completed', async (id, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAddAuthor({
        body,
        canAddMultipleAuthors: false,
        id,
        locale,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        otherAuthors: [...newReview.otherAuthors, body],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
    ])('when the form is incomplete', async (id, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthor({
        body,
        canAddMultipleAuthors: false,
        id,
        locale,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when there is no form', async (id, preprintTitle, body, method, user, locale, canAddMultipleAuthors) => {
    const actual = await _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.boolean(),
    fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
  ])(
    'when there are no more authors',
    async (id, preprintTitle, body, method, user, locale, canAddMultipleAuthors, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
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

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean()])(
    'when the preprint cannot be loaded',
    async (id, body, method, user, locale, canAddMultipleAuthors) => {
      const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
        TE.left(new PreprintIsUnavailable({})),
      )

      const actual = await _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
        formStore: new Keyv(),
        getPreprintTitle,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPreprintTitle).toHaveBeenCalledWith(id)
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean()])(
    'when the preprint cannot be found',
    async (id, body, method, user, locale, canAddMultipleAuthors) => {
      const actual = await _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.supportedLocale(),
    fc.boolean(),
  ])("when there isn't a session", async (id, preprintTitle, body, method, locale, canAddMultipleAuthors) => {
    const actual = await _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })
})
