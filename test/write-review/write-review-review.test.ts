import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.ts'
import {
  writeReviewMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
} from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { FormC, formKey } from '../../src/write-review/form.ts'
import * as _ from '../../src/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewReview', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.freeformForm(),
  ])('can view the form', async (preprintId, preprintTitle, body, method, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['html-editor.js', 'editor-toolbar.js'],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.html().map(String),
    fc.user(),
    fc.supportedLocale(),
    fc.completedFreeformForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, review, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, locale, user, body: { review }, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.html().map(String),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteFreeformForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, review, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, locale, user, body: { review }, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
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
    const actual = await _.writeReviewReview({ id: preprintId, user, locale, body, method })({
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
      const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
      const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
      const actual = await _.writeReviewReview({ id: preprintId, locale, user: undefined, body, method })({
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
    fc.record({ review: fc.constant('') }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.freeformForm(),
  ])('without a review', async (preprintId, preprintTitle, body, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
      status: StatusCodes.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.questionsForm(),
  ])(
    'when you said you want to answer questions',
    async (preprintId, preprintTitle, body, method, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.unknownFormType(),
  ])(
    'without saying if you have already written the PREreview',
    async (preprintId, preprintTitle, body, method, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
})
