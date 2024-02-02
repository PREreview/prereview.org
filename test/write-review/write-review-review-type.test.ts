import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes'
import { CompletedFormC } from '../../src/write-review/completed-form'
import { FormC, formKey } from '../../src/write-review/form'
import * as _ from '../../src/write-review/index'
import * as fc from './fc'

describe('writeReviewReviewType', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.option(fc.form(), { nil: undefined }),
  ])('can view the form', async (preprintId, preprint, body, method, user, newReview) => {
    const formStore = new Keyv()
    if (newReview) {
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
    }

    const actual = await _.writeReviewReviewType({ id: preprintId, user, body, method })({
      formStore,
      getPreprint: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
      status: Status.OK,
      title: expect.stringContaining('like'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('like'),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.reviewType(),
    fc.user(),
    fc
      .tuple(
        fc.completedFreeformForm().map(CompletedFormC.encode),
        fc.completedQuestionsForm().map(CompletedFormC.encode),
      )
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
  ])('when the form is completed', async (preprintId, preprint, reviewType, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

    const actual = await _.writeReviewReviewType({ id: preprintId, user, body: { reviewType }, method: 'POST' })({
      formStore,
      getPreprint: () => TE.right(preprint),
    })()

    expect(await formStore.get(formKey(user.orcid, preprint.id))).toMatchObject({ reviewType })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprint.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.reviewType(), fc.user(), fc.incompleteForm()])(
    'when the form is incomplete',
    async (preprintId, preprint, reviewType, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

      const actual = await _.writeReviewReviewType({ id: preprintId, user, body: { reviewType }, method: 'POST' })({
        formStore,
        getPreprint: () => TE.right(preprint),
      })()

      expect(await formStore.get(formKey(user.orcid, preprint.id))).toMatchObject({ reviewType })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.reviewType(), fc.user()])(
    'when there is no form',
    async (preprintId, preprint, reviewType, user) => {
      const actual = await _.writeReviewReviewType({ id: preprintId, user, body: { reviewType }, method: 'POST' })({
        formStore: new Keyv(),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user().chain(user => fc.tuple(fc.constant(user), fc.preprint({ authors: fc.constant([user]) }))),
    fc.anything(),
    fc.string(),
    fc.option(fc.form(), { nil: undefined }),
  ])('the user is an author', async (preprintId, [user, preprint], body, method, newReview) => {
    const formStore = new Keyv()
    if (newReview) {
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))
    }

    const actual = await _.writeReviewReviewType({ id: preprintId, user, body, method })({
      formStore: new Keyv(),
      getPreprint: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
      status: Status.Forbidden,
      title: expect.stringContaining('own preprint'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('own preprint'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user) => {
      const actual = await _.writeReviewReviewType({ id: preprintId, user, body, method })({
        formStore: new Keyv(),
        getPreprint: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user) => {
      const actual = await _.writeReviewReviewType({ id: preprintId, user, body, method })({
        formStore: new Keyv(),
        getPreprint: () => TE.left('not-found'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.record({ reviewType: fc.lorem() }, { withDeletedKeys: true }),
    fc.user(),
    fc.form(),
  ])(
    'without saying how you would like to write your PREreview',
    async (preprintId, preprint, body, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

      const actual = await _.writeReviewReviewType({ id: preprintId, user, body, method: 'POST' })({
        formStore,
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
        status: Status.BadRequest,
        title: expect.stringContaining('Error:'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('Error:'),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprint(), fc.anything(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprint, body, method) => {
      const formStore = new Keyv()

      const actual = await _.writeReviewReviewType({ id: preprintId, user: undefined, body, method })({
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
