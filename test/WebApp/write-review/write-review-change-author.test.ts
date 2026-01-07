import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch, writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewChangeAuthor', () => {
  describe('when the form is submitted', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.supportedLocale(),
      fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
      fc
        .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
        .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
    ])('when the form is valid', async (id, preprintTitle, user, locale, body, [newReview, number]) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewChangeAuthor({ body, id, locale, method: 'POST', number, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      const otherAuthors = [...(newReview.otherAuthors ?? [])]
      otherAuthors.splice(number - 1, 1, body)

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ otherAuthors })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.supportedLocale(),
      fc.oneof(
        fc.anything(),
        fc.record(
          {
            name: fc.anything().filter(value => typeof value !== 'string' || value === ''),
            emailAddress: fc.anything().filter(value => typeof value !== 'string' || !value.includes('@')),
          },
          { requiredKeys: [] },
        ),
      ),
      fc
        .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
        .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
    ])('when the form is invalid', async (id, preprintTitle, user, locale, body, [newReview, number]) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewChangeAuthor({ body, id, locale, method: 'POST', number, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprintTitle.id, number }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc
      .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
      .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
  ])('when the form needs submitting', async (id, preprintTitle, body, method, user, locale, [newReview, number]) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprintTitle.id, number }),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc
      .form({ moreAuthors: fc.constant('yes') })
      .chain(form =>
        fc.tuple(
          fc.constant(form),
          form.otherAuthors
            ? fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: form.otherAuthors.length + 1 }))
            : fc.integer(),
        ),
      ),
  ])("when the number doesn't match", async (id, preprintTitle, body, method, user, locale, [newReview, number]) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.integer(),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no form', async (id, preprintTitle, body, method, number, user, locale) => {
    const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
    fc.integer(),
    fc.user(),
    fc.supportedLocale(),
    fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
  ])('when there are no more authors', async (id, preprintTitle, body, method, number, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (id, body, method, number, user, locale) => {
      const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
        TE.left(new PreprintIsUnavailable({})),
      )

      const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (id, body, method, number, user, locale) => {
      const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
    fc.integer(),
    fc.supportedLocale(),
  ])("when there isn't a session", async (id, preprintTitle, body, method, number, locale) => {
    const actual = await _.writeReviewChangeAuthor({ body, id, locale, method, number })({
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
