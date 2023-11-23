import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import {
  writeReviewMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
} from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import * as fc from './fc'

describe('writeReviewReview', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.freeformForm(),
  ])('can view the form', async (preprintId, preprintTitle, body, method, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
      status: Status.OK,
      title: expect.stringContaining('your PREreview'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('your PREreview'),
      skipToLabel: 'form',
      js: ['html-editor.js', 'editor-toolbar.js'],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.html().map(String),
    fc.user(),
    fc.completedFreeformForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, review, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, user, body: { review }, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.html().map(String),
    fc.user(),
    fc.incompleteFreeformForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, review, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, user, body: { review }, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, body, method, user) => {
      const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user) => {
      const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left('unavailable'),
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
      const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left('not-found'),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method) => {
      const actual = await _.writeReviewReview({ id: preprintId, user: undefined, body, method })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.record({ review: fc.constant('') }, { withDeletedKeys: true }),
    fc.user(),
    fc.freeformForm(),
  ])('without a review', async (preprintId, preprintTitle, body, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, user, body, method: 'POST' })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
      status: Status.BadRequest,
      title: expect.stringContaining('Error:'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('Error:'),
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
    fc.questionsForm(),
  ])('when you said you want to answer questions', async (preprintId, preprintTitle, body, method, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.unknownFormType(),
  ])(
    'without saying if you have already written the PREreview',
    async (preprintId, preprintTitle, body, method, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewReview({ id: preprintId, user, body, method })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
