import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.js'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewUseOfAiMatch } from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewUseOfAi', () => {
  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), fc.form()])(
    'when there is a form',
    async (preprintId, preprintTitle, user, locale, form) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form))

      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprintTitle.id }),
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale()])(
    "when there isn't a form",
    async (preprintId, preprintTitle, user, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user: undefined })({
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

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
    'when the preprint is not found',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
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
})

describe('writeReviewUseOfAiSubmission', () => {
  describe('when there is a form', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') }),
      fc.supportedLocale(),
      fc.completedForm(),
    ])('when the form is completed', async (preprintId, preprintTitle, user, body, locale, form) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(form)))

      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(body)
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') }),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ])('when the form is incomplete', async (preprintId, preprintTitle, user, body, locale, form) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form))

      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(body)
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.oneof(
        fc.record({ generativeAiIdeas: fc.string().filter(s => !['yes', 'no'].includes(s)) }, { requiredKeys: [] }),
        fc.anything(),
      ),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ])('without declare the use of AI', async (preprintId, preprintTitle, user, body, locale, form) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form))

      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprintTitle.id }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.anything(), fc.supportedLocale()])(
    "when there isn't a form",
    async (preprintId, preprintTitle, user, body, locale) => {
      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, locale) => {
      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user: undefined })({
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
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.anything(),
  ])('when the preprint cannot be loaded', async (preprintId, user, locale, body) => {
    const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.anything(),
  ])('when the preprint is not found', async (preprintId, user, locale, body) => {
    const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
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
  })
})
