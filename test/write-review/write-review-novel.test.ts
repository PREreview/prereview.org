import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { CompletedFormC } from '../../src/write-review/completed-form.ts'
import { FormC, formKey } from '../../src/write-review/form.ts'
import * as _ from '../../src/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewNovel', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.novel(), fc.novelDetails()).map(([novel, novelDetails]) =>
      Tuple.make(novel, novelDetails, {
        novel,
        novelNoDetails: novelDetails.no,
        novelLimitedDetails: novelDetails.limited,
        novelSomeDetails: novelDetails.some,
        novelSubstantialDetails: novelDetails.substantial,
        novelHighlyDetails: novelDetails.highly,
      }),
    ),
    fc.user(),
    fc.supportedLocale(),
    fc.completedQuestionsForm(),
  ])(
    'when the form is completed',
    async (preprintId, preprintTitle, [novel, novelDetails, body], user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewNovel({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ novel, novelDetails })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.novel(), fc.novelDetails()).map(([novel, novelDetails]) =>
      Tuple.make(novel, novelDetails, {
        novel,
        novelNoDetails: novelDetails.no,
        novelLimitedDetails: novelDetails.limited,
        novelSomeDetails: novelDetails.some,
        novelSubstantialDetails: novelDetails.substantial,
        novelHighlyDetails: novelDetails.highly,
      }),
    ),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteQuestionsForm(),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [novel, novelDetails, body], user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNovel({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ novel, novelDetails })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no form', async (preprintId, preprintTitle, body, method, user, locale) => {
    const actual = await _.writeReviewNovel({ body, locale, method, id: preprintId, user })({
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
      const actual = await _.writeReviewNovel({ body, locale, method, id: preprintId, user })({
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
      const actual = await _.writeReviewNovel({ body, locale, method, id: preprintId, user })({
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
    fc.record({ novel: fc.lorem() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.questionsForm(),
  ])(
    'without saying if the preprint is likely to advance academic knowledge',
    async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNovel({ body, locale, method: 'POST', id: preprintId, user })({
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
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.oneof(fc.freeformForm(), fc.constant({})),
  ])(
    "when you haven't said you want to answer questions",
    async (preprintId, preprintTitle, body, method, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewNovel({ body, locale, method, id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method, locale) => {
      const formStore = new Keyv()

      const actual = await _.writeReviewNovel({ body, locale, method, id: preprintId, user: undefined })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
