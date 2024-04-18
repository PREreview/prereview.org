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
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.preprintTitle({ id: fc.oneof(fc.biorxivPreprintId(), fc.scieloPreprintId()) }),
        ])('when the preprint is supported', async (preprint, user, preprintTitle) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = await _.requestReview({ preprint, user })({
            canRequestReviews: () => true,
            getReviewRequest,
            getPreprintTitle,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Request a PREreview'),
            nav: expect.stringContaining('Back'),
            main: expect.stringContaining('request a PREreview'),
            skipToLabel: 'main',
            js: [],
            allowRobots: false,
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.preprintTitle({
            id: fc.oneof(
              fc.africarxivPreprintId(),
              fc.arxivPreprintId(),
              fc.authoreaPreprintId(),
              fc.chemrxivPreprintId(),
              fc.eartharxivPreprintId(),
              fc.ecoevorxivPreprintId(),
              fc.edarxivPreprintId(),
              fc.engrxivPreprintId(),
              fc.medrxivPreprintId(),
              fc.metaarxivPreprintId(),
              fc.osfPreprintId(),
              fc.osfPreprintsPreprintId(),
              fc.philsciPreprintId(),
              fc.preprintsorgPreprintId(),
              fc.psyarxivPreprintId(),
              fc.psychArchivesPreprintId(),
              fc.researchSquarePreprintId(),
              fc.scienceOpenPreprintId(),
              fc.socarxivPreprintId(),
              fc.techrxivPreprintId(),
              fc.zenodoPreprintId(),
            ),
          }),
        ])("when the preprint isn't supported", async (preprint, user, preprintTitle) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = await _.requestReview({ preprint, user })({
            canRequestReviews: () => true,
            getReviewRequest,
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
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        })

        test.prop([fc.indeterminatePreprintId(), fc.user()])(
          "when the preprint doesn't exist",
          async (preprint, user) => {
            const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('not-found'))

            const actual = await _.requestReview({ preprint, user })({
              canRequestReviews: () => true,
              getReviewRequest,
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
            expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          },
        )

        test.prop([fc.indeterminatePreprintId(), fc.user()])(
          "when the preprint can't be loaded",
          async (preprint, user) => {
            const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
            const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

            const actual = await _.requestReview({ preprint, user })({
              canRequestReviews: () => true,
              getReviewRequest,
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
            expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          },
        )
      })

      test.prop([fc.indeterminatePreprintId(), fc.user(), fc.reviewRequest()])(
        'when a review has been started',
        async (preprint, user, reviewRequest) => {
          const actual = await _.requestReview({ preprint, user })({
            canRequestReviews: () => true,
            getPreprintTitle: shouldNotBeCalled,
            getReviewRequest: () => TE.right(reviewRequest),
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(requestReviewStartMatch.formatter, {}),
          })
        },
      )

      test.prop([fc.indeterminatePreprintId(), fc.user()])("when a review can't be loaded", async (preprint, user) => {
        const actual = await _.requestReview({ preprint, user })({
          canRequestReviews: () => true,
          getPreprintTitle: shouldNotBeCalled,
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
      })
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
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
