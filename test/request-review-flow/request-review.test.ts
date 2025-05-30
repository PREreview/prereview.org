import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { PreprintIsNotFound, PreprintIsUnavailable, type GetPreprintTitleEnv } from '../../src/preprint.js'
import * as _ from '../../src/request-review-flow/index.js'
import type { GetReviewRequestEnv } from '../../src/review-request.js'
import { requestReviewMatch, requestReviewStartMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('requestReview', () => {
  describe('when the user is logged in', () => {
    describe("when a review hasn't been started", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.supportedLocale(),
      ])('when the preprint is supported', async (preprint, user, preprintTitle, locale) => {
        const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

        const actual = await _.requestReview({ preprint, user, locale })({
          getReviewRequest,
          getPreprintTitle,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(requestReviewMatch.formatter, { id: preprintTitle.id }),
          status: Status.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
          allowRobots: false,
        })
        expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
        expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.option(fc.user(), { nil: undefined }),
        fc.preprintTitle({ id: fc.notAReviewRequestPreprintId() }),
        fc.supportedLocale(),
      ])("when the preprint isn't supported", async (preprint, user, preprintTitle, locale) => {
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

        const actual = await _.requestReview({ preprint, user, locale })({
          getReviewRequest: shouldNotBeCalled,
          getPreprintTitle,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
      })

      test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
        "when the preprint doesn't exist",
        async (preprint, user, locale) => {
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
            TE.left(new PreprintIsNotFound({})),
          )

          const actual = await _.requestReview({ preprint, user, locale })({
            getReviewRequest: shouldNotBeCalled,
            getPreprintTitle,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        },
      )

      test.prop([fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()])(
        "when the preprint can't be loaded",
        async (preprint, user, locale) => {
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
            TE.left(new PreprintIsUnavailable({})),
          )

          const actual = await _.requestReview({ preprint, user, locale })({
            getReviewRequest: shouldNotBeCalled,
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
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        },
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.reviewRequest(),
      fc.supportedLocale(),
    ])('when a review has been started', async (preprint, user, preprintTitle, reviewRequest, locale) => {
      const actual = await _.requestReview({ preprint, user, locale })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest: () => TE.right(reviewRequest),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(requestReviewStartMatch.formatter, { id: preprint }),
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.supportedLocale(),
    ])("when a review can't be loaded", async (preprint, user, preprintTitle, locale) => {
      const actual = await _.requestReview({ preprint, user, locale })({
        getPreprintTitle: () => TE.right(preprintTitle),
        getReviewRequest: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })
})
