import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.js'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewReviewType', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.option(fc.form(), { nil: undefined }),
  ])('can view the form', async (preprintId, preprint, body, method, user, locale, newReview) => {
    const formStore = new Keyv()
    if (newReview) {
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
    }

    const actual = await _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
      formStore,
      getPreprint: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
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
    fc.preprint(),
    fc.reviewType(),
    fc.user(),
    fc.supportedLocale(),
    fc
      .tuple(
        fc.completedFreeformForm().map(CompletedFormC.encode),
        fc.completedQuestionsForm().map(CompletedFormC.encode),
      )
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
  ])('when the form is completed', async (preprintId, preprint, reviewType, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

    const actual = await _.writeReviewReviewType({
      id: preprintId,
      locale,
      user,
      body: { reviewType },
      method: 'POST',
    })({
      formStore,
      getPreprint: () => TE.right(preprint),
    })()

    expect(await formStore.get(formKey(user.orcid, preprint.id))).toMatchObject({ reviewType })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprint.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.reviewType(),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteForm(),
  ])('when the form is incomplete', async (preprintId, preprint, reviewType, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

    const actual = await _.writeReviewReviewType({
      id: preprintId,
      locale,
      user,
      body: { reviewType },
      method: 'POST',
    })({
      formStore,
      getPreprint: () => TE.right(preprint),
    })()

    expect(await formStore.get(formKey(user.orcid, preprint.id))).toMatchObject({ reviewType })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.reviewType(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprint, reviewType, user, locale) => {
      const actual = await _.writeReviewReviewType({
        id: preprintId,
        locale,
        user,
        body: { reviewType },
        method: 'POST',
      })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
    fc.supportedLocale(),
    fc.anything(),
    fc.string(),
    fc.option(fc.form(), { nil: undefined }),
  ])('the user is an author', async (preprintId, [user, preprint], locale, body, method, newReview) => {
    const formStore = new Keyv()
    if (newReview) {
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
    }

    const actual = await _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
      formStore: new Keyv(),
      getPreprint: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
      status: StatusCodes.Forbidden,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
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

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.record({ reviewType: fc.lorem() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.form(),
  ])(
    'without saying how you would like to write your PREreview',
    async (preprintId, preprint, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

      const actual = await _.writeReviewReviewType({ id: preprintId, locale, user, body, method: 'POST' })({
        formStore,
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprint, body, method, locale) => {
      const formStore = new Keyv()

      const actual = await _.writeReviewReviewType({ id: preprintId, locale, user: undefined, body, method })({
        formStore,
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(writeReviewMatch.formatter, { id: preprint.id }),
      })
    },
  )
})
