import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../src/preprint.js'
import { writeReviewAddAuthorMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewAddAuthors', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.user(),
    fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
  ])('when there is another author to add', async (preprintId, preprintTitle, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewAddAuthors({
      body: { anotherAuthor: 'yes' },
      id: preprintId,
      method: 'POST',
      user,
    })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewAddAuthorMatch.formatter, { id: preprintTitle.id }),
    })
  })

  describe("when there aren't more authors to add", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) }),
    ])('when the form is completed', async (preprintId, preprintTitle, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAddAuthors({
        body: { anotherAuthor: 'no' },
        id: preprintId,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
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
      fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
    ])('when the form is incomplete', async (preprintId, preprintTitle, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthors({
        body: { anotherAuthor: 'no' },
        id: preprintId,
        method: 'POST',
        user,
      })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
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
    fc.form({ moreAuthors: fc.constantFrom('yes'), otherAuthors: fc.constantFrom([], undefined) }),
  ])('when there are no authors', async (preprintId, preprintTitle, body, method, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewAddAuthors({ body, id: preprintId, method, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewAddAuthorMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, body, method, user) => {
      const actual = await _.writeReviewAddAuthors({ id: preprintId, body, method, user })({
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
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
  ])('when there are no more authors', async (preprintId, preprintTitle, body, method, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewAddAuthors({ body, id: preprintId, method, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user) => {
      const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

      const actual = await _.writeReviewAddAuthors({ body, id: preprintId, method, user })({
        formStore: new Keyv(),
        getPreprintTitle,
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

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user) => {
      const actual = await _.writeReviewAddAuthors({ body, id: preprintId, method, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left('not-found'),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method) => {
      const actual = await _.writeReviewAddAuthors({ body, id: preprintId, method })({
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
})
