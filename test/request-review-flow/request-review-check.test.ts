import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import * as _ from '../../src/request-review-flow/check-page'
import { RedirectResponse } from '../../src/response'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request'
import { requestReviewCheckMatch, requestReviewMatch, requestReviewPublishedMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewCheck', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
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
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, {}) }),
          )
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { status: 'completed' })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
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
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('unable to'),
            skipToLabel: 'main',
            js: [],
          })
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { status: 'completed' })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
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
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('unable to'),
            skipToLabel: 'main',
            js: [],
          })
          expect(publishRequest).toHaveBeenCalledWith(preprintTitle.id)
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.string().filter(method => method !== 'POST'),
        fc.user(),
        fc.incompleteReviewRequest(),
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
          canonical: format(requestReviewCheckMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('Check your request'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('Check your request'),
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
        location: format(requestReviewPublishedMatch.formatter, {}),
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
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
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
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
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
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
