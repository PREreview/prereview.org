import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import * as _ from '../../src/request-review-flow/persona-page'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request'
import {
  requestReviewCheckMatch,
  requestReviewMatch,
  requestReviewPersonaMatch,
  requestReviewPublishedMatch,
} from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewPersona', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
          fc.constantFrom('public', 'pseudonym'),
        ])('when the persona is set', async (preprint, user, reviewRequest, preprintTitle, persona) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

          const actual = await _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user })({
            getReviewRequest,
            getPreprintTitle,
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { ...reviewRequest, persona })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
          fc.constantFrom('public', 'pseudonym'),
        ])("when the persona can't be set", async (preprint, user, reviewRequest, preprintTitle, persona) => {
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))

          const actual = await _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user })({
            getReviewRequest: () => TE.right(reviewRequest),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.ServiceUnavailable,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('problems'),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { ...reviewRequest, persona })
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.anything(),
      ])('when the form is invalid', async (preprint, user, reviewRequest, preprintTitle, body) => {
        const actual = await _.requestReviewPersona({ body, preprint, method: 'POST', user })({
          getReviewRequest: () => TE.right(reviewRequest),
          getPreprintTitle: () => TE.right(preprintTitle),
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
          status: Status.BadRequest,
          title: expect.stringContaining('Error: What name would you like to use?'),
          main: expect.stringContaining('What name would you like to use?'),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
      ])('when the form needs submitting', async (preprint, user, reviewRequest, preprintTitle, method, body) => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

        const actual = await _.requestReviewPersona({ body, preprint, method, user })({
          getReviewRequest,
          getPreprintTitle,
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
          status: Status.OK,
          title: expect.stringContaining('What name would you like to use?'),
          main: expect.stringContaining('What name would you like to use?'),
          skipToLabel: 'form',
          js: [],
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
        expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.completedReviewRequest(),
      fc.string(),
      fc.anything(),
    ])('when the request is already complete', async (preprint, user, preprintTitle, reviewRequest, method, body) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, user })({
        getReviewRequest: () => TE.right(reviewRequest),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(requestReviewPublishedMatch.formatter, { id: preprint }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.string(),
      fc.anything(),
    ])("when a request hasn't been started", async (preprint, user, preprintTitle, method, body) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, user })({
        getReviewRequest: () => TE.left('not-found'),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user(),
    fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
    fc.string(),
    fc.anything(),
  ])('when the request cannot be loaded', async (preprint, user, preprintTitle, method, body) => {
    const actual = await _.requestReviewPersona({ body, preprint, method, user })({
      getReviewRequest: () => TE.left('unavailable'),
      getPreprintTitle: () => TE.right(preprintTitle),
      saveReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.string(), fc.anything()])(
    'when the preprint cannot be loaded',
    async (preprint, user, method, body) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, user })({
        getReviewRequest: () => shouldNotBeCalled,
        getPreprintTitle: () => TE.left('unavailable'),
        saveReviewRequest: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.anything(), fc.reviewRequest()])(
    'when the user is not logged in',
    async (preprint, method, body) => {
      const actual = await _.requestReviewPersona({ body, preprint, method })({
        getReviewRequest: shouldNotBeCalled,
        getPreprintTitle: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(requestReviewMatch.formatter, { id: preprint }),
      })
    },
  )
})
