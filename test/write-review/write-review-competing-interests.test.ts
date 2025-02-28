import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewCompetingInterestsMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewCompetingInterests', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.oneof(
      fc.constant({ competingInterests: 'no' }),
      fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
    ),
    fc.user(),
    fc.completedForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, competingInterests, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

    const actual = await _.writeReviewCompetingInterests({
      body: competingInterests,
      id: preprintId,
      method: 'POST',
      user,
    })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.oneof(
      fc.constant({ competingInterests: 'no' }),
      fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
    ),
    fc.user(),
    fc.incompleteForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, competingInterests, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewCompetingInterests({
      body: competingInterests,
      id: preprintId,
      method: 'POST',
      user,
    })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, body, user) => {
      const actual = await _.writeReviewCompetingInterests({ body, id: preprintId, method: 'POST', user })({
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
      const actual = await _.writeReviewCompetingInterests({ body, id: preprintId, method, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user) => {
      const actual = await _.writeReviewCompetingInterests({ body, id: preprintId, method, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
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
      const actual = await _.writeReviewCompetingInterests({ body, id: preprintId, method, user: undefined })({
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
    fc.oneof(
      fc.record({ competingInterests: fc.string() }, { withDeletedKeys: true }),
      fc.record(
        { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
        { withDeletedKeys: true },
      ),
    ),
    fc.user(),
    fc.form(),
  ])('without declaring any competing interests', async (preprintId, preprintTitle, body, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewCompetingInterests({ body, id: preprintId, method: 'POST', user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewCompetingInterestsMatch.formatter, { id: preprintTitle.id }),
      status: Status.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['conditional-inputs.js', 'error-summary.js'],
    })
  })
})
