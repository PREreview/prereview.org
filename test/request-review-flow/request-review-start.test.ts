import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/request-review-flow'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewStart', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      test.prop([fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.reviewRequestPreprintId() })])(
        "when a request hasn't been started",
        async (preprint, user, preprintTitle) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

          const actual = await _.requestReviewStart({ preprint, user })({
            canRequestReviews: () => true,
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest,
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(requestReviewCheckMatch.formatter, {}),
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, { status: 'incomplete' })
        },
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.completedReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      ])('when a request has already been completed', async (preprint, user, reviewRequest, preprintTitle) => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))

        const actual = await _.requestReviewStart({ preprint, user })({
          canRequestReviews: () => true,
          getPreprintTitle: () => TE.right(preprintTitle),
          getReviewRequest,
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, {}),
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      ])('when a request has already been started', async (preprint, user, reviewRequest, preprintTitle) => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))

        const actual = await _.requestReviewStart({ preprint, user })({
          canRequestReviews: () => true,
          getPreprintTitle: () => TE.right(preprintTitle),
          getReviewRequest,
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewStartMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('Request a PREreview'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('Continue'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
      })
    })

    test.prop([fc.indeterminatePreprintId(), fc.user()])("when reviews can't be requested", async (preprint, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReviewStart({ preprint, user })({
        canRequestReviews,
        getPreprintTitle: shouldNotBeCalled,
        getReviewRequest: shouldNotBeCalled,
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
      expect(canRequestReviews).toHaveBeenCalledWith(user)
    })
  })

  test.prop([fc.indeterminatePreprintId()])('when the user is not logged in', async preprint => {
    const actual = await _.requestReviewStart({ preprint })({
      canRequestReviews: shouldNotBeCalled,
      getPreprintTitle: shouldNotBeCalled,
      getReviewRequest: shouldNotBeCalled,
      saveReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewStartMatch.formatter, {}),
    })
  })
})
