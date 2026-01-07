import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewMatch, writeReviewPublishMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewAuthors', () => {
  describe('when there are more authors', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.constant({ moreAuthors: 'yes', moreAuthorsApproved: 'yes' }),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ])('when they have read and agreed', async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        moreAuthors: 'yes',
        moreAuthorsApproved: 'yes',
        otherAuthors: newReview.otherAuthors ?? [],
      })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record(
        { moreAuthors: fc.constant('yes'), moreAuthorsApproved: fc.string() },
        { requiredKeys: ['moreAuthors'] },
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ])("when they haven't read and agreed", async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['conditional-inputs.js', 'error-summary.js'],
      })
    })

    describe("when they don't want to be listed", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record(
          { moreAuthors: fc.constantFrom('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
        fc.user(),
        fc.supportedLocale(),
        fc.completedForm(),
      ])('when the form is completed', async (preprintId, preprintTitle, body, user, locale, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

        const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
          moreAuthors: 'yes-private',
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record(
          { moreAuthors: fc.constant('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
        fc.user(),
        fc.supportedLocale(),
        fc.incompleteForm(),
      ])('when the form is incomplete', async (preprintId, preprintTitle, body, user, locale, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
          moreAuthors: 'yes-private',
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      })
    })
  })

  describe("when there aren't more authors", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record(
        { moreAuthors: fc.constantFrom('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
        { requiredKeys: ['moreAuthors'] },
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.completedForm(),
    ])('when the form is completed', async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record(
        { moreAuthors: fc.constant('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
        { requiredKeys: ['moreAuthors'] },
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ])('when the form is incomplete', async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
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
  ])('when there is no form', async (preprintId, preprintTitle, body, method, user, locale) => {
    const actual = await _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
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

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method, locale) => {
      const actual = await _.writeReviewAuthors({ body, locale, method, id: preprintId, user: undefined })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.record({ moreAuthors: fc.string(), moreAuthorsApproved: fc.moreAuthorsApproved() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.form(),
  ])('without a moreAuthors', async (preprintId, preprintTitle, body, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      status: StatusCodes.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['conditional-inputs.js', 'error-summary.js'],
    })
  })
})
