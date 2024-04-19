import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import * as _ from '../../src/request-review-flow'
import type { GetReviewRequestEnv } from '../../src/review-request'
import { requestReviewMatch, requestReviewStartMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReview', () => {
  describe('when the user is logged in', () => {
    describe('when reviews can be requested', () => {
      describe("when a review hasn't been started", () => {
        test.prop([fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.reviewRequestPreprintId() })])(
          'when the preprint is supported',
          async (preprint, user, preprintTitle) => {
            const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

            const actual = await _.requestReview({ preprint, user })({
              canRequestReviews: () => true,
              getReviewRequest,
              getPreprintTitle,
            })()

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: format(requestReviewMatch.formatter, { id: preprintTitle.id }),
              status: Status.OK,
              title: expect.stringContaining('Request a PREreview'),
              nav: expect.stringContaining('Back'),
              main: expect.stringContaining('request a PREreview'),
              skipToLabel: 'main',
              js: [],
              allowRobots: false,
            })
            expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          },
        )

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.preprintTitle({ id: fc.notAReviewRequestPreprintId() }),
        ])("when the preprint isn't supported", async (preprint, user, preprintTitle) => {
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = await _.requestReview({ preprint, user })({
            canRequestReviews: () => true,
            getReviewRequest: shouldNotBeCalled,
            getPreprintTitle,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.NotFound,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        })

        test.prop([fc.indeterminatePreprintId(), fc.user()])(
          "when the preprint doesn't exist",
          async (preprint, user) => {
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('not-found'))

            const actual = await _.requestReview({ preprint, user })({
              canRequestReviews: () => true,
              getReviewRequest: shouldNotBeCalled,
              getPreprintTitle,
            })()

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: Status.NotFound,
              title: expect.stringContaining('not found'),
              main: expect.stringContaining('not found'),
              skipToLabel: 'main',
              js: [],
            })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          },
        )

        test.prop([fc.indeterminatePreprintId(), fc.user()])(
          "when the preprint can't be loaded",
          async (preprint, user) => {
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

            const actual = await _.requestReview({ preprint, user })({
              canRequestReviews: () => true,
              getReviewRequest: shouldNotBeCalled,
              getPreprintTitle,
            })()

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: Status.ServiceUnavailable,
              title: expect.stringContaining('problems'),
              main: expect.stringContaining('problems'),
              skipToLabel: 'main',
              js: [],
            })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          },
        )
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.reviewRequest(),
      ])('when a review has been started', async (preprint, user, preprintTitle, reviewRequest) => {
        const actual = await _.requestReview({ preprint, user })({
          canRequestReviews: () => true,
          getPreprintTitle: () => TE.right(preprintTitle),
          getReviewRequest: () => TE.right(reviewRequest),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(requestReviewStartMatch.formatter, { id: preprint }),
        })
      })

      test.prop([fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.reviewRequestPreprintId() })])(
        "when a review can't be loaded",
        async (preprint, user, preprintTitle) => {
          const actual = await _.requestReview({ preprint, user })({
            canRequestReviews: () => true,
            getPreprintTitle: () => TE.right(preprintTitle),
            getReviewRequest: () => TE.left('unavailable'),
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
    })

    test.prop([fc.indeterminatePreprintId(), fc.user()])("when reviews can't be requested", async (preprint, user) => {
      const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => false)

      const actual = await _.requestReview({ preprint, user })({
        canRequestReviews,
        getPreprintTitle: shouldNotBeCalled,
        getReviewRequest: shouldNotBeCalled,
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
    const actual = await _.requestReview({ preprint })({
      canRequestReviews: shouldNotBeCalled,
      getPreprintTitle: shouldNotBeCalled,
      getReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, { id: preprint }),
    })
  })
})
