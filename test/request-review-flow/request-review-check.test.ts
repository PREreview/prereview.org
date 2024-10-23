import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPreprintTitleEnv } from '../../src/preprint.js'
import * as _ from '../../src/request-review-flow/check-page/index.js'
import { RedirectResponse } from '../../src/response.js'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request.js'
import {
  requestReviewCheckMatch,
  requestReviewMatch,
  requestReviewPersonaMatch,
  requestReviewPublishedMatch,
} from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('requestReviewCheck', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        ])('when the request can be published', async (preprint, user, reviewRequest, preprintTitle) => {
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))
          const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.right(undefined))

          const actual = await _.requestReviewCheck({
            method: 'POST',
            preprint,
            user,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest,
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual(
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprintTitle.id }) }),
          )
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id, user, reviewRequest.persona)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { status: 'completed' })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        ])("when the request state can't be changed", async (preprint, user, reviewRequest, preprintTitle) => {
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))
          const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.right(undefined))

          const actual = await _.requestReviewCheck({
            method: 'POST',
            preprint,
            user,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest,
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: Status.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id, user, reviewRequest.persona)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { status: 'completed' })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        ])('when the request can not be published', async (preprint, user, reviewRequest, preprintTitle) => {
          const publishRequest = jest.fn<_.PublishRequestEnv['publishRequest']>(_ => TE.left('unavailable'))

          const actual = await _.requestReviewCheck({
            method: 'POST',
            preprint,
            user,
          })({
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest,
            saveReviewRequest: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: Status.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id, user, reviewRequest.persona)
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.string().filter(method => method !== 'POST'),
        fc.user(),
        fc.incompleteReviewRequest({ persona: fc.constantFrom('public', 'pseudonym') }),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      ])('when the form needs submitting', async (preprint, method, user, reviewRequest, preprintTitle) => {
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

        const actual = await _.requestReviewCheck({
          method,
          preprint,
          user,
        })({
          getPreprintTitle,
          getReviewRequest: () => TE.right(reviewRequest),
          publishRequest: shouldNotBeCalled,
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
          status: Status.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
        expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.completedReviewRequest(),
    ])('when the request is already complete', async (preprint, method, user, preprintTitle, reviewRequest) => {
      const actual = await _.requestReviewCheck({
        method,
        preprint,
        user,
      })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest: () => TE.right(reviewRequest),
        publishRequest: shouldNotBeCalled,
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
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.incompleteReviewRequest({ persona: fc.constant(undefined) }),
    ])("when a name hasn't been chosen", async (preprint, method, user, preprintTitle, reviewRequest) => {
      const actual = await _.requestReviewCheck({
        method,
        preprint,
        user,
      })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest: () => TE.right(reviewRequest),
        publishRequest: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(requestReviewPersonaMatch.formatter, { id: preprint }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
    ])("when a request hasn't been started", async (preprint, method, user, preprintTitle) => {
      const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))

      const actual = await _.requestReviewCheck({
        method,
        preprint,
        user,
      })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest,
        publishRequest: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.string(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
    ])("when the request can't be loaded", async (preprint, method, user, preprintTitle) => {
      const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))

      const actual = await _.requestReviewCheck({
        method,
        preprint,
        user,
      })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest,
        publishRequest: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.string()])('when the user is not logged in', async (preprint, method) => {
    const actual = await _.requestReviewCheck({ method, preprint })({
      getPreprintTitle: shouldNotBeCalled,
      getReviewRequest: shouldNotBeCalled,
      publishRequest: shouldNotBeCalled,
      saveReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, { id: preprint }),
    })
  })
})
